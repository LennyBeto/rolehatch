// frontend/lib/cvReadiness.ts
import type { CVData } from "./cvApi";

export type ReadinessCheck = { label: string; passed: boolean; hint: string };

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** 8 equal checks: all complete = 100%, one miss = 88% (so 95%+ means every section is complete). */
export function cvReadiness(cv: CVData) {
  const bullets = cv.experience.reduce((n, e) => n + e.bullets.length, 0);
  const sw = words(cv.summary);
  const checks: ReadinessCheck[] = [
    { label: "Full name", passed: cv.name.trim().length > 1, hint: "Add your full name" },
    { label: "Email address", passed: /\S+@\S+\.\S+/.test(cv.email), hint: "Add a valid email address" },
    { label: "Phone number", passed: cv.phone.replace(/\D/g, "").length >= 9, hint: "Add a phone number" },
    { label: "Professional summary (30–60 words)", passed: sw >= 30 && sw <= 60, hint: "Write a 30–50 word summary" },
    { label: "Work experience", passed: cv.experience.length > 0, hint: "Add at least one role under Work Experience" },
    { label: "Education", passed: cv.education.length > 0, hint: "Add your education or certifications" },
    { label: "5+ skills", passed: cv.skills.length >= 5, hint: "List at least 5 skills" },
    { label: "3+ achievement bullets", passed: bullets >= 3, hint: "Add 3+ bullets with measurable results" },
  ];
  const passed = checks.filter((c) => c.passed).length;
  return { score: Math.round((100 * passed) / checks.length), checks };
}