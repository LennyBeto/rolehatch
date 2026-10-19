// frontend/lib/formatPostAge.ts
export function formatPostAge(postedAt: string | null): string {
  if (!postedAt) return "Recently posted";
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return "Recently posted";

  const diffMs = Math.max(0, Date.now() - posted); // future/clock-skew dates show as "Just now"
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}