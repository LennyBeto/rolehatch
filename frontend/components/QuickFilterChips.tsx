// frontend/components/QuickFilterChips.tsx
"use client";
import { Wrap, Button } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";

const CHIPS = [
  { label: "AI/ML", type: "title", value: "ai-ml" },
  { label: "Backend", type: "title", value: "backend" },
  { label: "Frontend", type: "title", value: "frontend" },
  { label: "UI/UX", type: "title", value: "ui-ux" },
  { label: "Full-Stack", type: "title", value: "full-stack" },
  { label: "DevOps", type: "title", value: "devops" },
  { label: "SRE", type: "title", value: "sre" },
  { label: "Data Analytics", type: "title", value: "data-analytics" },
  { label: "Data Science", type: "title", value: "data-science" },
  { label: "Product Manager", type: "title", value: "product-manager" },
  { label: "Cybersecurity", type: "title", value: "cybersecurity" },
];

export default function QuickFilterChips() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isActive = (type: string, value: string) => {
    const current = searchParams.get(type) ?? "";
    return current.toLowerCase().includes(value.toLowerCase());
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
      // title chips toggle a single keyword on/off
      params.set("title", active ? "" : value);
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