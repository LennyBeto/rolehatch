// frontend/lib/formatPostAge.ts
export function formatPostAge(postedAt: string | null): string {
  if (!postedAt) return "Recently posted";
  const posted = new Date(postedAt).getTime();
  const diffMs = Date.now() - posted;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  const months = Math.floor(diffDays / 30);
  return `${months}mo ago`;
}