// frontend/lib/blogPosts.ts
export type FlowIconName =
  | "globe" | "refresh" | "search" | "send" | "user" | "badge"
  | "pin" | "building" | "file" | "bookmark" | "bell" | "target"
  | "mail" | "eyeoff" | "message";

export type FlowStep = { icon: FlowIconName; label: string; hint: string };

// An inline image shown after paragraph `afterParagraph` (0-based), highlighting flow step `focus`.
export type BlogFigureSpec = { afterParagraph: number; focus: number; caption: string };

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  publishedAt: string;
  category: string;
  flow: FlowStep[];
  figures: BlogFigureSpec[];
  coverAlt: string;
  coverImage?: string; // optional: set a real image path to replace the generated placeholder
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
    flow: [
      { icon: "globe", label: "Career page", hint: "The employer posts a role" },
      { icon: "refresh", label: "Hourly sync", hint: "We check every system" },
      { icon: "search", label: "Results", hint: "The role is searchable" },
      { icon: "send", label: "You apply", hint: "On the employer's site" },
    ],
    coverAlt: "Flow from a company career page, through PerchRole's hourly sync, to search results and your application.",
    figures: [
      { afterParagraph: 3, focus: 1, caption: "Every hour, PerchRole checks each company's system for new and updated roles." },
      { afterParagraph: 6, focus: 2, caption: "A role posted this morning can be searchable within the hour." },
    ],
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
    title: "Why Searching on PerchRole Will Always Be Free",
    excerpt: "Our monetization model, explained plainly, and why the core job search never costs you anything.",
    publishedAt: "2026-09-08",
    category: "Product",
    flow: [
      { icon: "building", label: "Employer", hint: "Posts a role for free" },
      { icon: "pin", label: "Featured", hint: "Pinned for 14 days" },
      { icon: "search", label: "Results", hint: "Clearly labeled" },
      { icon: "user", label: "You", hint: "Search and save free" },
    ],
    coverAlt: "Flow from an employer posting a role, to a featured listing pinned in search results, to a job seeker searching for free.",
    figures: [
      { afterParagraph: 2, focus: 1, caption: "Employers pay only if they want a listing pinned to the top of matching searches." },
      { afterParagraph: 4, focus: 3, caption: "Searching, filtering, saving jobs, tracking, and alerts stay free for every job seeker." },
    ],
    content: `Job boards have to make money somewhere, so here's exactly how PerchRole does it, and why searching never costs job seekers a thing.

1. Employers can post any job for free, no strings attached.

2. If an employer wants extra visibility, they can pay a flat fee to feature a listing — pinning it to the top of relevant searches for 14 days.

3. Featured listings are our main source of revenue. A few optional applicant tools, such as CV generation and ATS screening, include a free allowance and then ask for a small payment. There are no ads, and we never sell your data to recruiters.

4. Searching, filters, saved jobs, application tracking, and email alerts stay free, permanently.

Why this matters: job boards that charge candidates for the basics or sell their data create a conflict of interest between the platform and the people it's supposed to serve. Keeping the core job search ad-free and payment-free means PerchRole's incentives stay aligned with helping you find a real job, not extracting value from your job search.`,
  },
  {
    slug: "reading-a-job-posting-tech-stack",
    title: "How to Read a Job Posting's Tech Stack Before You Apply",
    excerpt: "A few minutes spent decoding a listing's real requirements can save you hours of a mismatched application.",
    publishedAt: "2026-09-15",
    category: "Job Search",
    flow: [
      { icon: "search", label: "Find a role", hint: "Open a listing" },
      { icon: "file", label: "Details", hint: "Read the tech stack" },
      { icon: "target", label: "Check fit", hint: "Stack, level, location" },
      { icon: "send", label: "Apply", hint: "Tailor, then send" },
    ],
    coverAlt: "Flow from finding a role, to reading its details and tech stack, to checking your fit and applying.",
    figures: [
      { afterParagraph: 1, focus: 1, caption: "Expanding Details shows the technologies named in the job description." },
      { afterParagraph: 4, focus: 2, caption: "Check stack, seniority, and location before you spend time tailoring." },
      { afterParagraph: 5, focus: 3, caption: "If everything lines up, tailor your resume and apply." },
    ],
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
    flow: [
      { icon: "mail", label: "Work email", hint: "Sign in with a magic link" },
      { icon: "badge", label: "Domain match", hint: "Ownership is verified" },
      { icon: "building", label: "Post a job", hint: "Scoped to your company" },
      { icon: "pin", label: "Feature it", hint: "Paid, then activated" },
    ],
    coverAlt: "Flow from signing in with a work email, to domain verification, to posting a job and featuring it.",
    figures: [
      { afterParagraph: 2, focus: 1, caption: "Your email domain decides which company's listings you can manage." },
      { afterParagraph: 4, focus: 3, caption: "A listing is featured only after the payment provider confirms payment." },
    ],
    content: `Anyone can type a company name into a form. That's why PerchRole ties every employer action to something harder to fake: the email domain you sign in with. Here's how it works.

1. You sign in with a magic link sent to your work email. There's no password to leak — access to your inbox is your proof of identity.

2. When you post a job, the listing is attached to a company record scoped to your email domain. Sign in as you@acme.com and you can manage Acme's listings — and only Acme's.

3. Featuring a listing is only available when your sign-in domain matches the company that owns the job. Someone using a personal address can't promote or manage a company they don't belong to.

4. A promotion is activated only after Paystack confirms payment through a signed webhook — never from a browser redirect.

For job seekers, this means fewer fake postings pretending to be a well-known employer. For employers, it means nobody else can spend money or make changes in your name.`,
  },
  {
    slug: "job-alerts-let-new-roles-find-you",
    title: "Set Up Job Alerts and Let New Roles Find You",
    excerpt: "Stop refreshing the search page. A keyword and a frequency are all it takes to stay ahead of new listings.",
    publishedAt: "2026-09-29",
    category: "Job Search",
    flow: [
      { icon: "mail", label: "Your email", hint: "Where alerts arrive" },
      { icon: "search", label: "Keyword", hint: "Short and specific" },
      { icon: "bell", label: "Frequency", hint: "Daily or weekly" },
      { icon: "send", label: "Apply", hint: "Act on new matches" },
    ],
    coverAlt: "Flow from entering your email, to choosing a keyword and frequency, to applying to new matches.",
    figures: [
      { afterParagraph: 2, focus: 1, caption: "A specific keyword gives you fewer, better matches." },
      { afterParagraph: 3, focus: 2, caption: "Daily while you're applying, weekly while you're watching the market." },
    ],
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
    flow: [
      { icon: "bookmark", label: "Save", hint: "Build a shortlist" },
      { icon: "send", label: "Applied", hint: "Record what you sent" },
      { icon: "eyeoff", label: "Hide", hint: "Drop what's ruled out" },
    ],
    coverAlt: "Flow from saving a role, to marking it applied, to hiding roles you have ruled out.",
    figures: [
      { afterParagraph: 1, focus: 0, caption: "Save the roles you want to come back to." },
      { afterParagraph: 2, focus: 1, caption: "Mark Applied so you never apply twice." },
      { afterParagraph: 3, focus: 2, caption: "Hidden jobs are cleared automatically after five days." },
    ],
    content: `Job hunting gets chaotic fast: ten tabs, three spreadsheets, and no memory of which roles you already applied to. PerchRole gives every signed-in job seeker three simple tools to stay organized.

1. Save — bookmark roles you want to come back to. Browse first, then review your shortlist before you start tailoring resumes.

2. Mark Applied — record that you've submitted an application, so you never apply to the same role twice or lose track of where you've been.

3. Hide — remove roles you've ruled out, whether it's the wrong seniority, the wrong location, or a company you'd rather skip. Your search stays focused on what's relevant, and hidden jobs are cleared automatically after five days.

Each action is tied to your account and protected at both the API and database level, so nobody else can see or change your list. Sign in with a magic link and your tracking follows you across devices.`,
  },
  {
    slug: "getting-your-cv-past-ats-filters",
    title: "How to Get Your CV Past ATS Filters",
    excerpt: "Most applications are read by software first. A few formatting and wording choices decide whether a person ever sees yours.",
    publishedAt: "2026-10-20",
    category: "Job Search",
    flow: [
      { icon: "file", label: "Your CV", hint: "Plain, single column" },
      { icon: "target", label: "Match", hint: "Use the posting's words" },
      { icon: "badge", label: "ATS scan", hint: "Fix gaps first" },
      { icon: "send", label: "Apply", hint: "Send with confidence" },
    ],
    coverAlt: "Flow from writing a plain CV, to matching the job posting, to running an ATS scan, to applying.",
    figures: [
      { afterParagraph: 1, focus: 0, caption: "Structure first: one column, standard headings, nothing important in text boxes." },
      { afterParagraph: 2, focus: 1, caption: "Mirror the posting's own terms, wherever they are true for you." },
      { afterParagraph: 3, focus: 2, caption: "Scan the finished CV, fix the gaps, then apply." },
    ],
    content: `Many companies run applications through an applicant tracking system (ATS) before a recruiter reads them. The software parses your CV into fields like name, roles, dates, and skills, and anything it can't read can go missing. Here's how to make yours easy to parse.

1. Start plain. Use a single column, standard headings such as Work Experience, Education, and Skills, and a common font. Parsers often skip text boxes, tables, icons, and images. PerchRole's CV builder offers five single-column templates (Classic, Modern, Compact, Technical, and Executive) made for exactly this.

2. Match the posting's own words. If it says PostgreSQL, write PostgreSQL rather than "SQL databases". Only include skills you genuinely have.

3. Scan before you send. PerchRole's ATS scan checks a CV against common ATS criteria, so you can fix gaps while you can still change them.

Both the CV builder and the ATS scan come with a free allowance, and your dashboard shows what's left. A clean, readable CV won't guarantee an interview, but it makes sure your experience is actually seen.`,
  },
  {
    slug: "meet-perchie-your-job-search-assistant",
    title: "Meet Perchie: Your Built-In Job Search Assistant",
    excerpt: "Quick answers for interviews, CV wording, and how PerchRole works, without leaving the page.",
    publishedAt: "2026-11-10",
    category: "Product",
    flow: [
      { icon: "message", label: "Ask", hint: "In plain language" },
      { icon: "target", label: "Be specific", hint: "Share the role" },
      { icon: "badge", label: "Review", hint: "Check the answer" },
      { icon: "send", label: "Apply", hint: "Use it, then send" },
    ],
    coverAlt: "Flow from asking Perchie a question, to giving it detail, to reviewing the answer and applying.",
    figures: [
      { afterParagraph: 1, focus: 0, caption: "Open the chat widget on any page and ask in plain language." },
      { afterParagraph: 2, focus: 1, caption: "The more detail you give about the role, the more useful the answer." },
      { afterParagraph: 3, focus: 2, caption: "Treat every answer as a draft and check it yourself." },
    ],
    content: `Job searching raises small questions all day: how should I word this, what will they ask in the interview, is my CV clear? Perchie is the assistant built into PerchRole for exactly those moments. Here's how to get the most out of it.

1. Open the chat widget on any page and ask in plain language. Perchie can answer questions about PerchRole, interviews, CVs, and general requests.

2. Be specific. Paste the job title and the part of the listing you're unsure about, then ask for what you need: practice interview questions, a summary of the role, or a clearer way to word a CV bullet.

3. Treat answers as a draft. Perchie is an AI assistant and can be wrong, so check details yourself before you rely on them.

4. Keep private details out. Messages are processed by Google AI Studio (Gemini), so don't share passwords, payment details, or other sensitive information.

Used well, Perchie saves time on the small tasks so you can spend your energy on the applications that matter.`,
  },
];