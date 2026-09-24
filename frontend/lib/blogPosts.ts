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
    content: `Most job boards rely on employers manually reposting the same listing across a dozen platforms, or on aggregators scraping other aggregators. By the time you see a posting, it might already be closed.

Here's how PerchRole keeps listings fresh:

1. We connect directly to the applicant tracking systems (ATS) companies already use — Greenhouse, Lever, Workday, and BambooHR.

2. Our sync runs hourly, pulling new and updated postings straight from the source.

3. When a role closes on the employer's own career page, it's automatically marked inactive on PerchRole — no stale links, no ghost listings.

4. Every listing links back to the employer's original posting, so you always apply through the real source.

The result: a role posted on a company's career page this morning can show up in PerchRole search within the hour, instead of waiting days for a manual repost. Fresher listings mean less wasted time applying to roles that no longer exist.`,
  },
  {
    slug: "free-for-job-seekers-always",
    title: "Why PerchRole Will Always Be Free for Job Seekers",
    excerpt: "Our monetization model, explained plainly — and why it never touches the candidate side.",
    publishedAt: "2026-09-08",
    content: `Job boards have to make money somewhere, so here's exactly how PerchRole does it — and why it never costs job seekers a thing.

1. Employers can post any job for free, no strings attached.

2. If an employer wants extra visibility, they can pay a flat fee to feature a listing — pinning it to the top of relevant searches for 14 days.

3. That's the entire monetization model. No paywalled search, no "apply faster" premium tier, and no selling your data to recruiters.

4. Every job-seeker feature — search, filters, saved jobs, application tracking, and email alerts — stays free, permanently.

Why this matters: job boards that charge candidates or sell their data create a conflict of interest between the platform and the people it's supposed to serve. Keeping the candidate side ad-free and payment-free means PerchRole's incentives stay aligned with helping you find a real job, not extracting value from your job search.`,
  },
  {
    slug: "reading-a-job-posting-tech-stack",
    title: "How to Read a Job Posting's Tech Stack Before You Apply",
    excerpt: "A few minutes spent decoding a listing's real requirements can save you hours of a mismatched application.",
    publishedAt: "2026-09-15",
    content: `A job title alone rarely tells the full story. Two "Backend Engineer" roles can require completely different skills depending on the company's actual stack. Here's a quick process to check fit before you apply.

1. Open the listing's "Details" section. PerchRole surfaces the technologies mentioned directly in the job description, so you don't have to hunt through paragraphs of text.

2. Compare the listed stack to tools you've actually used recently — not just things you've heard of. Recent, hands-on experience matters more than passing familiarity.

3. Check the seniority label against the actual responsibilities. A "Senior" title with junior-level duties (or vice versa) is a signal worth a second look.

4. Confirm the location and remote policy match what you're looking for. A great tech-stack match is a wasted read if the role requires on-site work you can't do.

5. If all four line up, tailor your resume to mirror the listing's specific keywords before submitting.

Filtering on these four checks upfront — stack, seniority, responsibilities, and location — takes a few minutes but saves both you and the employer from a mismatched application later.`,
  },
];