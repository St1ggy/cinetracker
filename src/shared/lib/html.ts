import DOMPurify from 'dompurify'

// Strip all HTML tags and decode entities — for short text previews (card descriptions).
export const stripHtml = (html: string): string => {
  const withNewlines = html.replaceAll(/<br\s*\/?>/gi, ' ')

  return withNewlines.replaceAll(/<[^>]{0,1000}>/g, '').trim()
}

// Sanitize HTML for safe rendering via {@html} — for full descriptions.
// Falls back to stripHtml during SSR since DOMPurify requires DOM.
export const sanitizeHtml = (html: string): string => {
  if (globalThis.document == undefined) {
    return stripHtml(html)
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li', 'a', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}
