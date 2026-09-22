// frontend/components/QuickFilterChips.tsx
"use client";
import { Wrap, Button } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";

const CHIPS = [
  { label: "AI/ML", type: "title", value: "artificial intelligence" },
  { label: "Backend", type: "title", value: "backend" },
  { label: "Frontend", type: "title", value: "frontend" },
  { label: "UI/UX", type: "title", value: "ux" },
  { label: "Full-Stack", type: "title", value: "full-stack" },
  { label: "DevOps", type: "title", value: "devops" },
  { label: "SRE", type: "title", value: "site reliability" },
  { label: "Data Analytics", type: "title", value: "data analyst" },
  { label: "Data Science", type: "title", value: "data scientist" },
  { label: "Product Manager", type: "title", value: "product manager" },
  { label: "Cybersecurity", type: "title", value: "security" },
];

export default function QuickFilterChips() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isActive = (type: string, value: string) => {
    const current = searchParams.get(type) ?? "";
    const normalizedCurrent = current.toLowerCase();
    const normalizedValue = value.toLowerCase();

    if (normalizedCurrent.includes(normalizedValue)) return true;

    const synonyms: Record<string, string[]> = {
      "artificial intelligence": ["artificial intelligence", "machine learning", "ai", "ml"],
      ux: ["ux", "ui/ux", "user experience", "design"],
      "site reliability": ["site reliability", "sre", "reliability engineer", "platform engineer"],
      "data analyst": ["data analyst", "analytics", "analysis"],
      "data scientist": ["data scientist", "data science", "scientist"],
      "product manager": ["product manager", "pm"],
      security: ["security", "cybersecurity", "information security", "security engineer"],
    };

    return (synonyms[normalizedValue] ?? []).some((term) => normalizedCurrent.includes(term));
  };

  const toggleChip = (type: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    const active = isActive(type, value);

    if (type === "remote_type") {
      const current = params.get("remote_type")?.split(",").filter(Boolean) ?? [];
      const next = active
        ? current.filter((v) => v.toLowerCase() !== value.toLowerCase())
        : [...current, value];
      if (next.length) params.set("remote_type", next.join(","));
      else params.delete("remote_type");
    } else {
      const nextValue = active ? "" : value;
      params.set("title", nextValue);
      if (!params.get("title")) params.delete("title");
    }

    router.push(`/?${params.toString()}`);
  };

  return (
    <Wrap gap={2} justify="center" pb={6}>
      {CHIPS.map((chip) => {
        const active = isActive(chip.type, chip.value);
        return (
          <Button
            key={chip.label}
            size="sm"
            borderRadius="full"
            variant={active ? "solid" : "outline"}
            colorPalette="brand"
            onClick={() => toggleChip(chip.type, chip.value)}
          >
            {chip.label}
          </Button>
        );
      })}
    </Wrap>
  );
}