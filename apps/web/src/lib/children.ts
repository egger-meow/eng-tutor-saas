import { getSupabaseClient } from './supabase'

export type Child = {
  id: string
  display_name: string
  grade: number
  grade_stage: 'incoming_grade_7' | 'grade_7' | 'grade_8' | 'grade_9'
  is_active: boolean
  timezone: string
  delivery_weekday: number
  textbook_version: string | null
  next_generation_at: string | null
  created_at: string
}

export type ChildInput = Pick<Child, 'display_name' | 'grade' | 'grade_stage'> & { textbook_version?: string | null }

function cleanInput(input: ChildInput): ChildInput {
  const displayName = input.display_name.trim()
  if (!displayName) throw new Error('請輸入孩子稱呼。')
  if (![7, 8, 9].includes(input.grade)) throw new Error('年級必須是七、八或九年級。')
  if (!['incoming_grade_7', 'grade_7', 'grade_8', 'grade_9'].includes(input.grade_stage)) throw new Error('請選擇目前就學階段。')
  const expectedGrade = input.grade_stage === 'incoming_grade_7' ? 7 : Number(input.grade_stage.slice(-1))
  if (input.grade !== expectedGrade) throw new Error('年級與就學階段不一致。')
  return { display_name: displayName, grade: input.grade, grade_stage: input.grade_stage, textbook_version: input.textbook_version?.trim() || null }
}

export async function listChildren(): Promise<Child[]> {
  const { data, error } = await getSupabaseClient().from('children').select('id, display_name, grade, grade_stage, is_active, timezone, delivery_weekday, textbook_version, next_generation_at, created_at').eq('is_active', true).order('created_at')
  if (error) throw error
  return data as Child[]
}

export async function createChild(input: ChildInput): Promise<string> {
  const { data: { user }, error: userError } = await getSupabaseClient().auth.getUser()
  if (userError || !user) throw userError ?? new Error('登入已失效，請重新登入。')
  const { data, error } = await getSupabaseClient().from('children').insert({ ...cleanInput(input), parent_id: user.id }).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function updateChild(id: string, input: ChildInput): Promise<void> {
  const { error } = await getSupabaseClient().from('children').update(cleanInput(input)).eq('id', id)
  if (error) throw error
}

export async function archiveChild(id: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('archive_owned_child', { p_child_id: id })
  if (error) throw error
}
