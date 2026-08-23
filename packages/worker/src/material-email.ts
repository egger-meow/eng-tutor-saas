import { createHmac } from 'node:crypto'
import type { WorkerClient } from './pipeline.js'
import type { TransactionalEmailProvider } from './transactional-email.js'

export type MaterialEmailClaim = {
  delivery_id: string
  material_id: string
  parent_id: string
  child_id: string
  recipient_email: string
  attempt_count: number
}

export type MaterialEmailEnvironment = {
  materialLinkSecret: string
  siteUrl: string
  emailFrom: string
}

export function materialAccessToken(deliveryId: string, secret: string): string {
  if (secret.length < 32) throw new Error('MATERIAL_LINK_SECRET must contain at least 32 characters')
  return createHmac('sha256', secret).update(`material-access/v1/${deliveryId}`).digest('base64url')
}

export function materialAccessTokenHash(token: string): string {
  return createHmac('sha256', 'paper-english/material-token-hash/v1').update(token).digest('hex')
}

export function buildMaterialReadyEmailHtml(link: string): string {
  const safeLink = link.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>本週紙屬英文教材準備好了</title></head>
<body style="margin:0;background:#f4f0e6;color:#24382f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC',sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf7;border:1px solid #ded7c7;border-radius:16px;overflow:hidden"><tr><td style="background:#173f35;padding:24px 32px;color:#fffdf7;font-family:Georgia,'Noto Serif TC',serif;font-size:26px;font-weight:700">紙屬英文</td></tr><tr><td style="padding:36px 32px"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.4">本週紙屬英文教材準備好了</h1><p style="margin:0 0 16px;font-size:16px;line-height:1.8">孩子的本週教材已經完成，可以開始使用。</p><p style="margin:28px 0;text-align:center"><a href="${safeLink}" style="display:inline-block;background:#c96c43;color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 26px;border-radius:999px">查看本週教材</a></p><p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #e5dfd2;font-size:14px;line-height:1.7;color:#617068">你也可以登入紙屬英文查看過去教材與學習紀錄。</p></td></tr></table></td></tr></table></body></html>`
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`)
  if (result.data === null) throw new Error(`${operation}: empty response`)
  return result.data
}

export async function dispatchMaterialEmails(
  client: WorkerClient,
  workerId: string,
  environment: MaterialEmailEnvironment,
  emailProvider: TransactionalEmailProvider,
  limit = 10,
): Promise<{ claimed: number; sent: number; failed: number }> {
  const claims = unwrap(await client.rpc('worker_claim_material_email_deliveries', {
    p_worker_id: workerId, p_limit: limit, p_lease_seconds: 300, p_max_attempts: 5,
  }), 'claim material email deliveries') as MaterialEmailClaim[]
  let sent = 0
  let failed = 0

  for (const claim of claims) {
    let providerAccepted = false
    try {
      const token = materialAccessToken(claim.delivery_id, environment.materialLinkSecret)
      const tokenReady = unwrap(await client.rpc('worker_set_material_email_token', {
        p_delivery_id: claim.delivery_id, p_worker_id: workerId, p_token_hash: materialAccessTokenHash(token),
      }), 'store material access token') as boolean
      if (!tokenReady) throw new Error('delivery claim no longer owns token provisioning')
      const link = `${environment.siteUrl.replace(/\/$/, '')}/material?t=${encodeURIComponent(token)}`
      const sendReady = unwrap(await client.rpc('worker_begin_material_email_send', {
        p_delivery_id: claim.delivery_id, p_worker_id: workerId,
      }), 'begin material email send') as boolean
      if (!sendReady) throw new Error('delivery claim could not enter SMTP send state')
      const result = await emailProvider.send({
        from: environment.emailFrom,
        to: claim.recipient_email,
        subject: '本週紙屬英文教材準備好了',
        html: buildMaterialReadyEmailHtml(link),
        idempotencyKey: `material-ready/${claim.delivery_id}`,
      })
      providerAccepted = true
      let completed = false
      let completionError: unknown
      for (let completionAttempt = 0; completionAttempt < 3 && !completed; completionAttempt++) {
        try {
          completed = unwrap(await client.rpc('worker_complete_material_email_delivery', {
            p_delivery_id: claim.delivery_id, p_worker_id: workerId, p_provider_message_id: result.messageId ?? null,
          }), 'complete material email delivery') as boolean
        } catch (error) {
          completionError = error
        }
      }
      if (completionError && !completed) throw completionError
      if (!completed) throw new Error('delivery claim could not record success')
      sent++
    } catch (error) {
      failed++
      const message = error instanceof Error ? error.message : String(error)
      if (!providerAccepted) {
        await client.rpc('worker_fail_material_email_delivery', {
          p_delivery_id: claim.delivery_id, p_worker_id: workerId, p_error: message.slice(0, 2000), p_max_attempts: 5,
        })
      }
      console.error('[AUDIT] material_email_failed', { deliveryId: claim.delivery_id, attempt: claim.attempt_count, error: message })
    }
  }
  return { claimed: claims.length, sent, failed }
}
