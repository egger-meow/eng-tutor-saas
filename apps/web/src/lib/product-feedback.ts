import { getSupabaseClient } from './supabase'

export const productFeedbackCategories = ['bug', 'flow', 'materials', 'other'] as const
export type ProductFeedbackCategory = typeof productFeedbackCategories[number]

export type ProductFeedbackInput = {
  category: ProductFeedbackCategory
  message: string
}

export function validateProductFeedback(input: ProductFeedbackInput): ProductFeedbackInput {
  if (!productFeedbackCategories.includes(input.category)) throw new Error('請選擇回饋類型。')
  const message = input.message.trim()
  if (!message) throw new Error('請填寫回饋內容。')
  if (message.length > 4000) throw new Error('回饋內容最多 4,000 字。')
  return { category: input.category, message }
}

export async function saveProductFeedback(input: ProductFeedbackInput): Promise<void> {
  const payload = validateProductFeedback(input)
  const client = getSupabaseClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('登入狀態已失效，請重新登入後再送出。')

  const { error } = await client.from('product_feedback').insert({
    parent_id: user.id,
    category: payload.category,
    message: payload.message,
  })
  if (error) throw error
}
