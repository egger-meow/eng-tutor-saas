import nodemailer from 'nodemailer'

export type TransactionalEmail = {
  from: string
  to: string
  subject: string
  html: string
  idempotencyKey: string
}

export type SendResult = {
  messageId?: string
}

export interface TransactionalEmailProvider {
  send(input: TransactionalEmail): Promise<SendResult>
}

export type SmtpEmailEnvironment = {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
}

export function smtpMessageId(idempotencyKey: string): string {
  const localPart = idempotencyKey.replace(/[^a-zA-Z0-9._-]/g, '.')
  return `<${localPart}@paperbond.jjmowlab.com>`
}

export function createSmtpEmailProvider(environment: SmtpEmailEnvironment): TransactionalEmailProvider {
  if (!environment.host || !environment.user || !environment.password) {
    throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS are required')
  }
  if (!Number.isInteger(environment.port) || environment.port < 1 || environment.port > 65_535) {
    throw new Error('SMTP_PORT must be a valid TCP port')
  }

  const transporter = nodemailer.createTransport({
    host: environment.host,
    port: environment.port,
    secure: environment.secure,
    requireTLS: !environment.secure,
    disableFileAccess: true,
    disableUrlAccess: true,
    auth: { user: environment.user, pass: environment.password },
  })

  return {
    async send(input) {
      const result = await transporter.sendMail({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        // SMTP has no universal idempotency primitive. A stable RFC Message-ID gives
        // Gmail and downstream mail systems the strongest provider-neutral dedupe hint.
        messageId: smtpMessageId(input.idempotencyKey),
      })
      return { messageId: result.messageId || undefined }
    },
  }
}
