import { z } from 'zod'

/** Canonical LLM casting output (multi-speaker). */
export const llmSegmentSchema = z.object({
  voice: z.string().min(1),
  character: z.string().default('narration'),
  text: z.string().min(1),
  rate: z.string().default('+0%'),
  pitch: z.string().default('+0Hz'),
  volume: z.string().default('+0%'),
})

export const llmCastingSchema = z.object({
  segments: z.array(llmSegmentSchema).min(1),
})

export type LlmSegment = z.infer<typeof llmSegmentSchema>
export type LlmCasting = z.infer<typeof llmCastingSchema>

/** Accept legacy field names from older prompts. */
export function normalizeLlmCasting(raw: unknown): LlmCasting {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const list = (obj.segments || obj.result || obj.data || []) as any[]
  const segments = (Array.isArray(list) ? list : [])
    .map((s) => ({
      voice: String(s.voice || s.name || s.Name || '').trim(),
      character: String(s.character || s.charactor || s.role || 'narration').trim() || 'narration',
      text: String(s.text || '').trim(),
      rate: String(s.rate || '+0%'),
      pitch: String(s.pitch || '+0Hz'),
      volume: String(s.volume || '+0%'),
    }))
    .filter((s) => s.voice && s.text)
  return llmCastingSchema.parse({ segments })
}
