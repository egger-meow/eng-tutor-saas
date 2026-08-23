import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json', 'cache-control': 'no-store' } })
}

async function tokenHash(token: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('paper-english/material-token-hash/v1'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json(503, { error: 'server_not_configured' })

  try {
    const body = await request.json() as { token?: unknown }
    if (typeof body.token !== 'string' || body.token.length < 40 || body.token.length > 200) return json(400, { error: 'invalid_link' })
    const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    let sessionUserId: string | null = null
    const authorization = request.headers.get('authorization')
    if (authorization?.startsWith('Bearer ')) {
      const { data: { user } } = await client.auth.getUser(authorization.slice(7))
      sessionUserId = user?.id ?? null
    }
    const { data, error } = await client.rpc('resolve_material_email_access', {
      p_token_hash: await tokenHash(body.token), p_session_user_id: sessionUserId,
    }).maybeSingle()
    if (error) throw error
    if (!data) return json(404, { error: 'invalid_or_expired_link' })

    if (data.owner_session_matches) {
      return json(200, { ownerSessionMatches: true, canonicalPath: `/materials/${encodeURIComponent(data.material_id)}` })
    }
    const [student, parent] = await Promise.all([
      client.storage.from('weekly-materials').createSignedUrl(data.student_pdf_path, 300, { download: false }),
      client.storage.from('weekly-materials').createSignedUrl(data.parent_answer_pdf_path, 300, { download: false }),
    ])
    if (student.error || parent.error) throw student.error ?? parent.error
    return json(200, {
      ownerSessionMatches: false,
      material: { childName: data.child_name, materialWeek: data.material_week, weekNumber: Number(data.week_number) },
      studentPdfUrl: student.data.signedUrl,
      parentAnswerPdfUrl: parent.data.signedUrl,
      loggedIn: sessionUserId !== null,
    })
  } catch (error) {
    console.error('Scoped material access failed', error instanceof Error ? error.message : String(error))
    return json(500, { error: 'material_access_unavailable' })
  }
})
