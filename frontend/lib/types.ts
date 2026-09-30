// frontend/lib/types.ts
export type EmployerJob = {
  id: string;
  title: string;
  location: string | null;
  remote_type: string | null;
  commitment: string | null;
  level: string | null;
  tech_stack: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  source: string;
  source_url: string;
  can_manage: boolean;
  is_featured: boolean;
  featured_until: string | null;
};