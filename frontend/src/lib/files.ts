import type { KnowledgeDocument } from '../types'

export function isImageDocument(
  document: Pick<KnowledgeDocument, 'mimeType' | 'fileName'>,
) {
  if (document.mimeType?.startsWith('image/')) return true
  return /\.(png|jpe?g|webp|gif)$/i.test(document.fileName || '')
}
