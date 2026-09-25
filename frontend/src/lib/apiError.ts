type ErrorItem = { msg?: string; message?: string } | string | null | undefined

function stringifyDetail(detail: unknown): string | null {
  if (typeof detail === 'string') return detail || null
  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{ loc, msg, type }, ...]
    const parts = detail
      .map((item: ErrorItem) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') return item.msg || item.message || JSON.stringify(item)
        return String(item)
      })
      .filter(Boolean)
    return parts.length ? parts.join(', ') : null
  }
  if (detail && typeof detail === 'object') {
    const obj = detail as { msg?: string; message?: string }
    return obj.msg || obj.message || JSON.stringify(detail)
  }
  return null
}

/**
 * Human-readable message from an API error (axios + FastAPI `detail`).
 * Handles string, validation-array and object `detail` shapes; otherwise returns `fallback`.
 * With `includeMessage`, also falls back to a plain `detail`/`message` on the error itself.
 */
export function getApiError(
  err: unknown,
  fallback = 'Something went wrong',
  { includeMessage = false }: { includeMessage?: boolean } = {}
): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  const e = err as { response?: { data?: { detail?: unknown } }; detail?: unknown; message?: unknown }
  const detail = e.response?.data?.detail ?? (includeMessage ? (e.detail ?? e.message) : undefined)
  return stringifyDetail(detail) ?? fallback
}
