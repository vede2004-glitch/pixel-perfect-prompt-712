/** Stable per article: refreshes and language switches never shuffle its image. */
export function selectArticlePhoto(photos: readonly string[], articleId: string): string | undefined {
  if (!photos.length) return undefined;
  let hash = 0;
  for (const character of articleId) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  return photos[hash % photos.length];
}