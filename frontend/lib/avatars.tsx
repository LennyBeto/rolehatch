// frontend/lib/avatars.tsx
import type { ReactElement } from "react";

type AvatarOption = {
  id: string;
  label: string;
  Svg: ReactElement;
};

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: "male-1",
    label: "Short hair, blue shirt",
    Svg: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="100" height="100" fill="#F6F5F1" />
        <path d="M20 100c0-16 13-26 30-26s30 10 30 26z" fill="#2F4F7F" />
        <rect x="42" y="58" width="16" height="14" fill="#D9A066" />
        <circle cx="50" cy="42" r="22" fill="#D9A066" />
        <path d="M28 36a22 22 0 0 1 44 0c-4-6-12-10-22-10s-18 4-22 10z" fill="#3B2A20" />
      </svg>
    ),
  },
  {
    id: "male-2",
    label: "Side part, green shirt",
    Svg: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="100" height="100" fill="#F6F5F1" />
        <path d="M20 100c0-16 13-26 30-26s30 10 30 26z" fill="#2F6F4F" />
        <rect x="42" y="58" width="16" height="14" fill="#C98A55" />
        <circle cx="50" cy="42" r="22" fill="#C98A55" />
        <path d="M27 34c2-12 11-20 23-20s18 6 21 16c-8-4-15-2-22 1-9 4-16 1-22 3z" fill="#20140D" />
      </svg>
    ),
  },
  {
    id: "male-3",
    label: "Buzz cut, orange shirt",
    Svg: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="100" height="100" fill="#F6F5F1" />
        <path d="M20 100c0-16 13-26 30-26s30 10 30 26z" fill="#B85C2E" />
        <rect x="42" y="58" width="16" height="14" fill="#8A5A3B" />
        <circle cx="50" cy="42" r="22" fill="#8A5A3B" />
        <path d="M29 30a21 21 0 0 1 42 0 24 24 0 0 0-42 0z" fill="#171310" />
      </svg>
    ),
  },
  {
    id: "female-1",
    label: "Long hair, pink shirt",
    Svg: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="100" height="100" fill="#F6F5F1" />
        <path d="M18 100c0-17 14-27 32-27s32 10 32 27z" fill="#C24B7C" />
        <rect x="42" y="58" width="16" height="14" fill="#EFC29A" />
        <path d="M22 46c-2-22 10-38 28-38s30 16 28 38c-3-4-6-6-6-14a22 22 0 0 0-44 0c0 8-3 10-6 14z" fill="#4A2E1C" />
        <circle cx="50" cy="42" r="22" fill="#EFC29A" />
        <path d="M25 40c-2 14 0 26 6 32-6-2-11-14-9-30zM75 40c2 14 0 26-6 32 6-2 11-14 9-30z" fill="#4A2E1C" />
      </svg>
    ),
  },
  {
    id: "female-2",
    label: "Ponytail, purple shirt",
    Svg: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="100" height="100" fill="#F6F5F1" />
        <path d="M18 100c0-17 14-27 32-27s32 10 32 27z" fill="#6B3FA0" />
        <rect x="42" y="58" width="16" height="14" fill="#8D5A34" />
        <circle cx="50" cy="42" r="22" fill="#8D5A34" />
        <path d="M28 32a22 22 0 0 1 44 0c0-2 0-4-1-6-6 2-32 2-42 0-1 2-1 4-1 6z" fill="#241608" />
        <path d="M74 34c8 4 12 14 8 26-4-10-8-18-8-26z" fill="#241608" />
      </svg>
    ),
  },
  {
    id: "female-3",
    label: "Bob cut, teal shirt",
    Svg: (
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <rect width="100" height="100" fill="#F6F5F1" />
        <path d="M18 100c0-17 14-27 32-27s32 10 32 27z" fill="#1F8A8A" />
        <rect x="42" y="58" width="16" height="14" fill="#E8B48C" />
        <path d="M23 44c-3-20 8-36 27-36s30 16 27 36c-2-2-4-3-4-9a23 23 0 0 0-46 0c0 6-2 7-4 9z" fill="#12100E" />
        <circle cx="50" cy="42" r="22" fill="#E8B48C" />
        <path d="M24 38c-1 8 0 14 3 18-4-2-7-10-5-20zM76 38c1 8 0 14-3 18 4-2 7-10 5-20z" fill="#12100E" />
      </svg>
    ),
  },
];

export function getAvatarById(id: string | null | undefined) {
  return AVATAR_OPTIONS.find((a) => a.id === id) ?? null;
}