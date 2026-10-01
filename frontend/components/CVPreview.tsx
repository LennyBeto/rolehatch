// frontend/components/CVPreview.tsx
"use client";
import type { CVData, CVEntry, CVTemplate } from "@/lib/cvApi";
import { splitDate } from "@/lib/cvDates";

// A4 in points: same page and margins as the generated PDF, so preview == output.
const PAGE_W = 595;
const PAGE_H = 842;
const PX_PER_PT = 96 / 72;
const ENTRY_KEYS = ["experience", "education", "projects", "certifications"] as const;

type Props = { cv: CVData; template: CVTemplate; scale?: number };

export default function CVPreview({ cv, template: t, scale = 0.62 }: Props) {
  const center = t.align === "center";
  const family = t.font_family === "serif" ? "'Times New Roman', Times, serif" : "Helvetica, Arial, sans-serif";
  const pad = t.margin * 72;
  const contact = [cv.email, cv.phone, cv.location, ...cv.links].filter(Boolean).join(" | ");

  const heading = (key: string) => (
    <div
      style={{
        fontWeight: 700, fontSize: `${t.base + 1.5}pt`, color: t.accent,
        marginTop: `${t.gap}pt`, marginBottom: "2pt", paddingBottom: t.rule ? "2pt" : 0,
        borderBottom: t.rule ? `0.6pt solid ${t.accent}` : "none",
        textTransform: t.caps ? "uppercase" : "none",
      }}
    >
      {t.labels[key]}
    </div>
  );

  const entryLine = (text: string, i: number) => {
    const [left, date] = splitDate(text);
    return (
      <div
        key={i}
        style={{ display: "flex", justifyContent: "space-between", gap: "8pt", fontWeight: i === 0 ? 700 : 400, fontStyle: i === 0 ? "normal" : "italic", marginTop: i === 0 ? "4pt" : 0 }}
      >
        <span>{left}</span>
        {date && <span style={{ whiteSpace: "nowrap" }}>{date}</span>}
      </div>
    );
  };

  const entries = (items: CVEntry[]) =>
    items.map((e, i) => (
      <div key={i} style={{ marginBottom: "2pt" }}>
        {e.lines.map(entryLine)}
        {e.bullets.map((b, j) => (
          <div key={j} style={{ paddingLeft: "14pt", textIndent: "-9pt" }}>• {b}</div>
        ))}
      </div>
    ));

  return (
    <div
      style={{
        width: PAGE_W * PX_PER_PT * scale, height: PAGE_H * PX_PER_PT * scale, overflow: "hidden",
        background: "#fff", border: "1px solid #E5E3DD", borderRadius: 6, flexShrink: 0,
      }}
    >
      <div
        style={{
          width: `${PAGE_W}pt`, height: `${PAGE_H}pt`, boxSizing: "border-box",
          padding: `${pad * 0.8}pt ${pad}pt`, overflow: "hidden",
          transform: `scale(${scale})`, transformOrigin: "top left",
          background: "#fff", color: "#111", fontFamily: family, fontSize: `${t.base}pt`, lineHeight: 1.3,
        }}
      >
        {cv.name && (
          <div style={{ fontSize: `${t.name_size}pt`, fontWeight: 700, color: t.accent, textAlign: center ? "center" : "left", lineHeight: 1.2 }}>
            {cv.name}
          </div>
        )}
        {contact && (
          <div style={{ fontSize: `${t.base - 0.5}pt`, textAlign: center ? "center" : "left", marginBottom: "4pt" }}>{contact}</div>
        )}

        {t.order.map((key) => {
          if (key === "summary" && cv.summary) return <div key={key}>{heading(key)}<div>{cv.summary}</div></div>;
          if (key === "skills" && cv.skills.length) return <div key={key}>{heading(key)}<div>{cv.skills.join(", ")}</div></div>;
          if ((ENTRY_KEYS as readonly string[]).includes(key)) {
            const items = cv[key as (typeof ENTRY_KEYS)[number]];
            if (items.length) return <div key={key}>{heading(key)}{entries(items)}</div>;
          }
          return null;
        })}
      </div>
    </div>
  );
}