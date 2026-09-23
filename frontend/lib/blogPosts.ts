// frontend/lib/blogPosts.ts
export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  publishedAt: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-we-scrape-career-pages-directly",
    title: "Why PerchRole Pulls Jobs Directly From Career Pages",
    excerpt: "Most job boards are full of reposted, stale listings. Here's why we built PerchRole differently.",
    publishedAt: "2026-09-01",
    content: `Most job boards rely on employers manually reposting the same listing across a dozen platforms, or on aggregators scraping other aggregators — by the time you see a posting, it might already be closed.

PerchRole takes a different approach: we sync directly with the applicant tracking systems companies already use — Greenhouse, Lever, Workday, and BambooHR — on an hourly cycle. When a role closes on the source, it disappears from PerchRole automatically. No stale links, no ghost listings.

This also means faster access: a role posted on a company's career page this morning can appear in PerchRole's search results within the hour, rather than waiting for a manual repost days later.`,
  },
  {
    slug: "free-for-job-seekers-always",
    title: "Why PerchRole Will Always Be Free for Job Seekers",
    excerpt: "Our monetization model, explained plainly — and why it never touches the candidate side.",
    publishedAt: "2026-09-08",
    content: `Job boards have to make money somewhere, and it's worth being upfront about how PerchRole does it.

We charge employers a flat fee to feature a listing — pinning it to the top of relevant searches for 14 days. That's the entire monetization model. No paywalled search, no premium "apply faster" tier, no selling your data to recruiters without your consent.

If you're job hunting, every feature on PerchRole — search, filters, saved jobs, application tracking, email alerts — is free, and we intend to keep it that way.`,
  },
  {
    slug: "reading-a-job-posting-tech-stack",
    title: "How to Read a Job Posting's Tech Stack Before You Apply",
    excerpt: "A few minutes spent decoding a listing's real requirements can save you hours of a mismatched application.",
    publishedAt: "2026-09-15",
    content: `A job title alone rarely tells the full story. Two "Backend Engineer" roles can require completely different skill sets depending on the company's actual stack.

On PerchRole, expanding a listing's "Details" section shows the technologies mentioned directly in the job description — giving you a faster read on fit before you spend time tailoring a resume.

A few things worth checking before applying: does the listed stack match tools you've actually used recently, is the seniority label consistent with the responsibilities described, and does the location/remote policy match what you're looking for. Filtering on these upfront saves both you and the employer time.`,
  },
];