// frontend/components/Logo.tsx
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="23" fill="#F6F5F1" stroke="#2F4F3F" strokeWidth="1.5" />
      {/* branch, angled slightly upward */}
      <path d="M10 30 L38 20" stroke="#2F4F3F" strokeWidth="2.2" strokeLinecap="round" />
      {/* perched bird: simple body + head + beak */}
      <path
        d="M26 20c-3-4-9-3-10 2-1 4 2 7 6 7 2 0 4-1 5-3l3 1-1-3c1-2 0-3-3-4z"
        fill="#2F4F3F"
      />
      {/* eye */}
      <circle cx="19" cy="21" r="1" fill="#F6F5F1" />
    </svg>
  );
}