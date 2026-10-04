// frontend/lib/blogPosts.ts
export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  publishedAt: string;
  category: string;
};

export function readingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-we-scrape-career-pages-directly",
    title: "Why PerchRole Pulls Jobs Directly From Career Pages",
    excerpt: "Most job boards are full of reposted, stale listings. Here's why we built PerchRole differently.",
    publishedAt: "2026-09-01",
    category: "Product",
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
    category: "Product",
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
    category: "Job Search",
    content: `A job title alone rarely tells the full story. Two "Backend Engineer" roles can require completely different skills depending on the company's actual stack. Here's a quick process to check fit before you apply.

1. Open the listing's "Details" section. PerchRole surfaces the technologies mentioned directly in the job description, so you don't have to hunt through paragraphs of text.

2. Compare the listed stack to tools you've actually used recently — not just things you've heard of. Recent, hands-on experience matters more than passing familiarity.

3. Check the seniority label against the actual responsibilities. A "Senior" title with junior-level duties (or vice versa) is a signal worth a second look.

4. Confirm the location and remote policy match what you're looking for. A great tech-stack match is a wasted read if the role requires on-site work you can't do.

5. If all four line up, tailor your resume to mirror the listing's specific keywords before submitting.

Filtering on these four checks upfront — stack, seniority, responsibilities, and location — takes a few minutes but saves both you and the employer from a mismatched application later.`,
  },
  {
    slug: "how-employer-verification-works",
    title: "How Employer Verification Keeps PerchRole Listings Trustworthy",
    excerpt: "Posting is free, but ownership isn't guesswork. Here's how email-domain verification protects job seekers and employers.",
    publishedAt: "2026-09-22",
    category: "Employers",
    content: `Anyone can type a company name into a form. That's why PerchRole ties every employer action to something harder to fake: the email domain you sign in with. Here's how it works.

1. You sign in with a magic link sent to your work email. There's no password to leak — access to your inbox is your proof of identity.

2. When you post a job, the listing is attached to a company record scoped to your email domain. Sign in as you@acme.com and you can manage Acme's listings — and only Acme's.

3. Featuring a listing is only available when your sign-in domain matches the company that owns the job. Someone using a personal address can't promote or manage a company they don't belong to.

4. A promotion is activated only after Stripe confirms payment through a signed webhook — never from a browser redirect.

For job seekers, this means fewer fake postings pretending to be a well-known employer. For employers, it means nobody else can spend money or make changes in your name.`,
  },
  {
    slug: "job-alerts-let-new-roles-find-you",
    title: "Set Up Job Alerts and Let New Roles Find You",
    excerpt: "Stop refreshing the search page. A keyword and a frequency are all it takes to stay ahead of new listings.",
    publishedAt: "2026-09-29",
    category: "Job Search",
    content: `Because PerchRole syncs with company career pages every hour, new roles show up quickly. The catch is that you still have to look. Job alerts remove that step. Here's how to set one up well.

1. Scroll to the "Never miss a matching role" section on the home page and enter your email.

2. Add a short, specific keyword such as "backend", "data scientist", or "product manager". A broad term like "engineer" will match far too much.

3. Choose a frequency: daily if you're actively applying, weekly if you're keeping an eye on the market.

4. Create separate alerts for separate role types instead of cramming everything into one keyword.

5. Switch to weekly once your application pipeline is full.

Alerts are free and you can unsubscribe any time. We store only your email, keyword, and frequency — nothing else.`,
  },
  {
    slug: "track-your-applications-save-applied-hide",
    title: "Track Your Applications: Save, Mark Applied, and Hide",
    excerpt: "Three small buttons that turn a messy job hunt into an organized pipeline.",
    publishedAt: "2026-10-04",
    category: "Job Search",
    content: `Job hunting gets chaotic fast: ten tabs, three spreadsheets, and no memory of which roles you already applied to. PerchRole gives every signed-in job seeker three simple tools to stay organized.

1. Save — bookmark roles you want to come back to. Browse first, then review your shortlist before you start tailoring resumes.

2. Mark Applied — record that you've submitted an application, so you never apply to the same role twice or lose track of where you've been.

3. Hide — remove roles you've ruled out, whether it's the wrong seniority, the wrong location, or a company you'd rather skip. Your search stays focused on what's relevant.

Each action is tied to your account and protected at both the API and database level, so nobody else can see or change your list. Sign in with a magic link and your tracking follows you across devices.`,
  },
];