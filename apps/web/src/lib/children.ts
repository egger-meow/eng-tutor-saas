import { getSupabaseClient } from './supabase'

export type Child = {
  id: string
  display_name: string
  grade: number
  is_active: boolean
  timezone: string
  delivery_weekday: number
  textbook_version: string | null
  next_generation_at: string | null
  created_at: string
}

type ChildInput = Pick<Child, 'display_name' | 'grade'>

function cleanInput(input: ChildInput): ChildInput {
  const displayName = input.display_name.trim()
  if (!displayName) throw new Error('請輸入孩子稱呼。')
  if (![7, 8, 9].includes(input.grade)) throw new Error('年級必須是七、八或九年級。')
  return { display_name: displayName, grade: input.grade }
}

export async function listChildren(): Promise<Child[]> {
  const { data, error } = await getSupabaseClient().from('children').select('id, display_name, grade, is_active, timezone, delivery_weekday, textbook_version, next_generation_at, created_at').eq('is_active', true).order('created_at')
  if (error) throw error
  return data as Child[]
}

export async function createChild(input: ChildInput): Promise<void> {
  const { data: { user }, error: userError } = await getSupabaseClient().auth.getUser()
  if (userError || !user) throw userError ?? new Error('登入已失效，請重新登入。')
  const { error } = await getSupabaseClient().from('children').insert({ ...cleanInput(input), parent_id: user.id })
  if (error) throw error
}

export async function updateChild(id: string, input: ChildInput): Promise<void> {
  const { error } = await getSupabaseClient().from('children').update(cleanInput(input)).eq('id', id)
  if (error) throw error
}

export async function archiveChild(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('children').update({ is_active: false }).eq('id', id)
  if (error) throw error
}
