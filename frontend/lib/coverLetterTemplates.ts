// frontend/lib/coverLetterTemplates.ts
export type CoverLetterData = {
  fullName: string;
  jobTitle: string;
  phone: string;
  email: string;
  location: string;
  date: string;
  recipientName: string;
  recipientTitle: string;
  company: string;
  companyAddress: string; // multi-line
  salutation: string;
  body: string; // blank line = new paragraph; lines starting with "- " = bullets
  closing: string;
  signature: string;
  postscript: string;
};

export type TemplateStyle = {
  fontFamily: string;
  nameSize: number;
  titleSize: number;
  headerAlign: "left" | "center";
  nameTransform: "none" | "uppercase";
  nameSpacing: string;
  contact: "labeled" | "inline";
  rule: boolean;
  ruleWeight: number;
  accent: string;
  titleColor: string;
  bodySize: number;
  lineHeight: number;
  justify: boolean;
  blockGap: number;
};

export type CoverLetterTemplate = {
  id: string;
  name: string;
  description: string;
  style: TemplateStyle;
};

export const COVER_LETTER_TEMPLATES: CoverLetterTemplate[] = [
  {
    id: "modern-clean",
    name: "Modern Clean",
    description: "Bold left-aligned name with labeled contact details and justified body text.",
    style: {
      fontFamily: "Arial, Helvetica, sans-serif",
      nameSize: 32, titleSize: 18, headerAlign: "left", nameTransform: "none", nameSpacing: "0",
      contact: "labeled", rule: false, ruleWeight: 1, accent: "#1a1a1a", titleColor: "#333333",
      bodySize: 14, lineHeight: 1.6, justify: true, blockGap: 18,
    },
  },
  {
    id: "classic-serif",
    name: "Classic Serif",
    description: "Traditional serif typography with a centered header and a thin divider.",
    style: {
      fontFamily: "Georgia, 'Times New Roman', serif",
      nameSize: 28, titleSize: 15, headerAlign: "center", nameTransform: "none", nameSpacing: "0",
      contact: "inline", rule: true, ruleWeight: 1, accent: "#1a1a1a", titleColor: "#444444",
      bodySize: 14, lineHeight: 1.55, justify: false, blockGap: 18,
    },
  },
  {
    id: "executive",
    name: "Executive",
    description: "Uppercase letter-spaced name with a single-line contact row. Formal and restrained.",
    style: {
      fontFamily: "Arial, Helvetica, sans-serif",
      nameSize: 24, titleSize: 14, headerAlign: "left", nameTransform: "uppercase", nameSpacing: "0.12em",
      contact: "inline", rule: true, ruleWeight: 1, accent: "#2F4F3F", titleColor: "#444444",
      bodySize: 13.5, lineHeight: 1.6, justify: false, blockGap: 18,
    },
  },
  {
    id: "compact-minimal",
    name: "Compact Minimal",
    description: "Tighter spacing so longer letters stay on one page.",
    style: {
      fontFamily: "Calibri, Arial, sans-serif",
      nameSize: 24, titleSize: 14, headerAlign: "left", nameTransform: "none", nameSpacing: "0",
      contact: "inline", rule: false, ruleWeight: 1, accent: "#1a1a1a", titleColor: "#444444",
      bodySize: 13, lineHeight: 1.45, justify: false, blockGap: 12,
    },
  },
  {
    id: "accent-line",
    name: "Accent Line",
    description: "Green accent title and rule. Colour is text-only, so parsers read it cleanly.",
    style: {
      fontFamily: "'Trebuchet MS', Arial, sans-serif",
      nameSize: 30, titleSize: 16, headerAlign: "left", nameTransform: "none", nameSpacing: "0",
      contact: "inline", rule: true, ruleWeight: 2, accent: "#2F4F3F", titleColor: "#2F4F3F",
      bodySize: 14, lineHeight: 1.6, justify: false, blockGap: 18,
    },
  },
];

export const DEFAULT_TEMPLATE_ID = COVER_LETTER_TEMPLATES[0].id;

export function isValidTemplateId(id: string | null | undefined): id is string {
  return !!id && COVER_LETTER_TEMPLATES.some((t) => t.id === id);
}

export function getTemplate(id: string | null | undefined): CoverLetterTemplate {
  return COVER_LETTER_TEMPLATES.find((t) => t.id === id) ?? COVER_LETTER_TEMPLATES[0];
}

export const EMPTY_COVER_LETTER: CoverLetterData = {
  fullName: "", jobTitle: "", phone: "", email: "", location: "", date: "",
  recipientName: "", recipientTitle: "", company: "", companyAddress: "",
  salutation: "Dear Hiring Manager,",
  body: "",
  closing: "Kind regards,",
  signature: "",
  postscript: "",
};

export const SAMPLE_COVER_LETTER: CoverLetterData = {
  fullName: "John Smith",
  jobTitle: "Marketing Specialist",
  phone: "774-987-4009",
  email: "john.smith@example.com",
  location: "Flowerville",
  date: "June 1, 2026",
  recipientName: "Ms. Katherine Bloomstein",
  recipientTitle: "Head of Marketing",
  company: "XYZ Company",
  companyAddress: "099 Peony Street\nFlowerville, Ohio 55675",
  salutation: "Dear Katherine,",
  body:
    "As a lifelong enthusiast of XYZ's marketing initiatives, I was thrilled to see your posting for the position of Digital Marketing Manager. I am positive I can help with XYZ's upcoming challenges. I have experience leading successful national online campaigns with budgets over $300,000, and I expanded ABC's client base by 19% since 2011.\n\n" +
    "In my current position at ABC, I have supervised all phases of our online marketing initiatives, both technical and creative. Last year, my key challenge was to design and optimize nine product websites and improve our SEO results. Here we are a year later:\n" +
    "- Eight of the nine websites I optimized secured a spot in the top 3 results on Google for 10+ key search terms;\n" +
    "- The incoming search engine traffic to all nine websites comprises 47% of the total organic traffic for key terms and phrases.\n\n" +
    "I know that XYZ's current plans involve developing a comprehensive online portal focused on healthcare-related issues. This project is a perfect match for my personal and professional interests, and I would love to leverage my knowledge of SEO marketing and online growth marketing to achieve groundbreaking results with this initiative.\n\n" +
    "I would welcome the chance to discuss your digital marketing objectives and show you how my success at ABC can translate into digital and online marketing growth for XYZ.",
  closing: "Kind regards,",
  signature: "John Smith",
  postscript: "P.S. I would also value the opportunity to show you how my e-detailing solutions grew the combined sales of three flagship products by 13% in one year.",
};

export type BodyBlock =
  | { type: "p"; text: string; tight: boolean }
  | { type: "ul"; items: string[]; tight: boolean };

/** Splits the body into paragraphs and bullet lists. "tight" = follows another block in the same chunk. */
export function parseBody(body: string): BodyBlock[] {
  const out: BodyBlock[] = [];
  body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .forEach((chunk) => {
      let first = true;
      let para: string[] = [];
      let items: string[] = [];
      const flushP = () => {
        if (para.length) {
          out.push({ type: "p", text: para.join(" "), tight: !first });
          first = false;
          para = [];
        }
      };
      const flushU = () => {
        if (items.length) {
          out.push({ type: "ul", items, tight: !first });
          first = false;
          items = [];
        }
      };
      chunk.split("\n").forEach((raw) => {
        const line = raw.trim();
        if (!line) return;
        const m = line.match(/^[-•*]\s+(.*)$/);
        if (m) {
          flushP();
          items.push(m[1]);
        } else {
          flushU();
          para.push(line);
        }
      });
      flushP();
      flushU();
    });
  return out;
}

export function toPlainText(d: CoverLetterData): string {
  const lines: string[] = [];
  const push = (...l: (string | false | undefined)[]) => l.forEach((x) => x && lines.push(x));
  push(d.fullName, d.jobTitle, d.phone && `Phone: ${d.phone}`, d.email && `E-mail: ${d.email}`);
  lines.push("");
  push([d.location, d.date].filter(Boolean).join(", "));
  lines.push("");
  push(d.recipientName, d.recipientTitle);
  lines.push("");
  push(d.company, ...d.companyAddress.split("\n").map((l) => l.trim()));
  lines.push("");
  push(d.salutation);
  lines.push("");
  parseBody(d.body).forEach((b) => {
    if (b.type === "p") lines.push(b.text);
    else b.items.forEach((i) => lines.push(`- ${i}`));
    lines.push("");
  });
  push(d.closing, d.signature);
  if (d.postscript) {
    lines.push("");
    lines.push(d.postscript);
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}