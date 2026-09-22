// frontend/components/QuickFilterChips.tsx
"use client";
import { Wrap, Button } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";

const CHIPS = [
  { label: "AI/ML", type: "title", value: "artificial intelligence|machine learning" },
  { label: "Backend", type: "title", value: "backend" },
  { label: "Frontend", type: "title", value: "frontend" },
  { label: "UI/UX", type: "title", value: "ui/ux|user experience" },
  { label: "Full-Stack", type: "title", value: "full-stack" },
  { label: "DevOps", type: "title", value: "devops" },
  { label: "SRE", type: "title", value: "site reliability|sre" },
  { label: "Data Analytics", type: "title", value: "data analytics|data analyst" },
  { label: "Data Science", type: "title", value: "data science|data scientist" },
  { label: "Product Manager", type: "title", value: "product manager|pm" },
  { label: "Cybersecurity", type: "title", value: "cybersecurity|security" },
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
      "artificial intelligence|machine learning": ["artificial intelligence", "machine learning", "ai", "ml", "artificial intelligence engineer", "machine learning engineer"],
      "ui/ux|user experience": ["ux", "ui/ux", "user experience", "design", "product designer", "interaction designer"],
      "site reliability|sre": ["site reliability", "sre", "reliability engineer", "platform engineer"],
      "data analytics|data analyst": ["data analytics", "data analyst", "analytics", "analysis"],
      "data science|data scientist": ["data science", "data scientist", "scientist"],
      "product manager|pm": ["product manager", "pm"],
      "cybersecurity|security": ["security", "cybersecurity", "information security", "security engineer"],
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