import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recordMaterialLearningEvent } from './material-learning-analytics'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('./supabase', () => ({ getSupabaseClient: () => ({ rpc }) }))

describe('private learning signals', () => {
  beforeEach(() => rpc.mockReset())
  it('sends only the opaque material ID and a fixed event', async () => {
    rpc.mockResolvedValue({ error: null })
    await recordMaterialLearningEvent('synthetic-material', 'answer_started')
    expect(rpc).toHaveBeenCalledWith('record_material_learning_event', {
      p_material_id: 'synthetic-material', p_event_name: 'answer_started',
    })
  })
  it('does not interrupt learning when instrumentation is unavailable', async () => {
    rpc.mockRejectedValue(new Error('offline'))
    await expect(recordMaterialLearningEvent('synthetic-material', 'save_failed')).resolves.toBeUndefined()
    rpc.mockResolvedValue({ error: { message: 'not deployed' } })
    await expect(recordMaterialLearningEvent('synthetic-material', 'material_opened')).resolves.toBeUndefined()
  })
})
