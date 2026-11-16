/** Preserve existing HTML; provide escaped HTML for plain-text queue writers. */
export function emailHtml(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.html === 'string') return payload.html
  if (typeof payload.text !== 'string') return undefined
  const escaped = payload.text.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character)
  return `<pre>${escaped}</pre>`
}