// frontend/components/cover-letter/CoverLetterPreview.tsx
// Plain semantic HTML (no tables, images, or columns) so exported PDFs stay ATS-parseable.
import type { CSSProperties } from "react";
import { CoverLetterData, getTemplate, parseBody } from "@/lib/coverLetterTemplates";

type Props = { data: CoverLetterData; templateId: string; id?: string };

export default function CoverLetterPreview({ data, templateId, id }: Props) {
  const s = getTemplate(templateId).style;
  const blocks = parseBody(data.body);
  const dateLine = [data.location, data.date].filter(Boolean).join(", ");
  const inlineContact = [data.phone, data.email].filter(Boolean).join(" | ");
  const addressLines = data.companyAddress.split("\n").map((l) => l.trim()).filter(Boolean);
  const section: CSSProperties = { marginTop: s.blockGap };

  return (
    <div
      id={id}
      style={{
        background: "#ffffff",
        color: "#1a1a1a",
        fontFamily: s.fontFamily,
        fontSize: s.bodySize,
        lineHeight: s.lineHeight,
        width: "100%",
        maxWidth: 794,
        minHeight: 1123,
        padding: 56,
        boxSizing: "border-box",
        textAlign: "left",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: s.headerAlign }}>
        {data.fullName && (
          <div
            style={{
              fontSize: s.nameSize,
              fontWeight: 700,
              lineHeight: 1.15,
              textTransform: s.nameTransform,
              letterSpacing: s.nameSpacing,
              color: s.accent,
            }}
          >
            {data.fullName}
          </div>
        )}
        {data.jobTitle && (
          <div style={{ fontSize: s.titleSize, marginTop: 4, color: s.titleColor }}>{data.jobTitle}</div>
        )}
        {s.contact === "labeled" ? (
          <div style={{ marginTop: 12, fontSize: s.bodySize - 1.5 }}>
            {data.phone && (
              <div>
                <strong>Phone</strong> {data.phone}
              </div>
            )}
            {data.email && (
              <div style={{ marginTop: 4 }}>
                <strong>E-mail</strong> {data.email}
              </div>
            )}
          </div>
        ) : (
          inlineContact && <div style={{ marginTop: 10, fontSize: s.bodySize - 1 }}>{inlineContact}</div>
        )}
        {s.rule && (
          <div style={{ marginTop: 14, height: s.ruleWeight, background: s.accent }} aria-hidden="true" />
        )}
      </div>

      {/* Date */}
      {dateLine && <div style={section}>{dateLine}</div>}

      {/* Recipient */}
      {(data.recipientName || data.recipientTitle) && (
        <div style={section}>
          {data.recipientName && <div style={{ fontWeight: 700 }}>{data.recipientName}</div>}
          {data.recipientTitle && <div style={{ fontStyle: "italic" }}>{data.recipientTitle}</div>}
        </div>
      )}
      {(data.company || addressLines.length > 0) && (
        <div style={section}>
          {data.company && <div>{data.company}</div>}
          {addressLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {/* Salutation */}
      {data.salutation && <div style={section}>{data.salutation}</div>}

      {/* Body */}
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <p
            key={i}
            style={{
              margin: 0,
              marginTop: b.tight ? 6 : s.blockGap,
              textAlign: s.justify ? "justify" : "left",
            }}
          >
            {b.text}
          </p>
        ) : (
          <ul
            key={i}
            style={{
              margin: 0,
              marginTop: b.tight ? 6 : s.blockGap,
              paddingLeft: 22,
              listStyleType: "disc",
              listStylePosition: "outside",
              textAlign: s.justify ? "justify" : "left",
            }}
          >
            {b.items.map((item, j) => (
              <li key={j} style={{ marginTop: j === 0 ? 0 : 4 }}>
                {item}
              </li>
            ))}
          </ul>
        )
      )}

      {/* Sign-off */}
      {(data.closing || data.signature) && (
        <div style={section}>
          {data.closing && <div>{data.closing}</div>}
          {data.signature && <div>{data.signature}</div>}
        </div>
      )}

      {/* P.S. */}
      {data.postscript && (
        <p style={{ margin: 0, marginTop: s.blockGap, textAlign: s.justify ? "justify" : "left" }}>
          {data.postscript}
        </p>
      )}
    </div>
  );
}