/**
 * State machine for one generation run at a time.
 *
 *   idle ──start()──▶ running ──finish(id)──▶ done       (success: toast + list item)
 *                        │ ──fail(id)────▶ failed     (error toast)
 *                        └ ──cancel()────▶ cancelled  (info toast, nothing added)
 *
 * Terminal states are mutually exclusive: whichever transition happens first wins and
 * every later one for that run (or for a stale, superseded run) returns false.
 * The run owns its AbortController so a cancel always reaches the in-flight request,
 * even after the request promise itself has resolved into a streaming body.
 */
export type RunState = 'idle' | 'running' | 'done' | 'failed' | 'cancelled'

export class GenerationRun {
  id = 0
  state: RunState = 'idle'
  private ctrl: AbortController | null = null

  start(): { id: number; signal: AbortSignal } {
    this.ctrl?.abort() // a new run supersedes any previous one
    this.id += 1
    this.state = 'running'
    this.ctrl = new AbortController()
    return { id: this.id, signal: this.ctrl.signal }
  }
  isLive(id: number) {
    return this.id === id && this.state === 'running'
  }
  private settle(id: number, to: RunState) {
    if (!this.isLive(id)) return false
    this.state = to
    this.ctrl = null
    return true
  }
  finish(id: number) {
    return this.settle(id, 'done')
  }
  fail(id: number) {
    return this.settle(id, 'failed')
  }
  /** Cancel the current run. Returns false when nothing is running (already done/failed/cancelled). */
  cancel() {
    if (this.state !== 'running') return false
    const ctrl = this.ctrl
    this.state = 'cancelled'
    this.ctrl = null
    ctrl?.abort()
    return true
  }
}

export const isAbortError = (e: unknown) => {
  const err = e as { name?: string; code?: string } | null
  return err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED'
}
