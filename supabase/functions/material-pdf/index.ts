import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const headers = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'content-type': 'application/json',
  'cache-control': 'no-store',
}
function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers })
}
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const url = Deno.env.get('SUPABASE_URL')!
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authorization = request.headers.get('authorization') ?? ''
  const admin = createClient(url, secret, { auth: { persistSession: false } })
  const { data: user, error: authError } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''))
  if (authError || !user.user) return json(401, { error: 'authentication_required' })
  try {
    const body = await request.json()
    if (typeof body.materialId !== 'string' || !['student', 'parent'].includes(body.kind)) return json(400, { error: 'invalid_request' })
    const scoped = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    })
    const { data: artifact, error } = await scoped.rpc('request_material_pdf', {
      p_material_id: body.materialId, p_kind: body.kind, p_retry: body.retry === true,
    })
    if (error) return json(error.code === '42501' ? 403 : 400, { error: 'material_unavailable' })
    if (artifact.state !== 'ready') return json(200, { state: artifact.state })
    const signed = await admin.storage.from('weekly-materials').createSignedUrl(artifact.path, 60)
    if (signed.error) {
      const code = String((signed.error as { statusCode?: string }).statusCode ?? '')
      if (code !== '404' && !/object not found/i.test(signed.error.message)) return json(503, { error: 'storage_unavailable' })
      const queued = await admin.rpc('queue_missing_material_pdf', { p_id: artifact.id, p_path: artifact.path })
      if (queued.error) throw queued.error
      return json(200, { state: 'queued' })
    }
    return json(200, { state: 'ready', url: signed.data.signedUrl })
  } catch {
    return json(503, { error: 'pdf_unavailable' })
  }
})
