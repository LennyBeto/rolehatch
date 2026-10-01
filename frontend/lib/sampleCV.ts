// frontend/lib/sampleCV.ts
import type { CVData } from "./cvApi";

export const SAMPLE_CV: CVData = {
  name: "John Smith",
  email: "johnsmith@gmail.com",
  phone: "404-555-0123",
  location: "Atlanta, GA",
  links: [],
  summary:
    "Dedicated and detail-oriented logistics and facility operations professional with active Secret Clearance. Proven ability to manage inventory, streamline operations, and oversee multimillion-dollar assets. Bilingual in English and Spanish, with a background in supply chain planning, preventive maintenance, and property accountability.",
  experience: [
    {
      lines: ["YOUR POSITION TITLE | COMPANY NAME, LOCATION  JAN 2026 – PRESENT"],
      bullets: [
        "Manage end-to-end inventory tracking, cyclic counts, and requisition fulfillment across departmental units, executing strict chain-of-custody protocols to maintain 100% inventory accuracy and operational continuity.",
        "Coordinate full-scope logistical support for departmental IT and operations sections, utilizing SAP ERP to maintain 100% fixed-asset accountability for high-value technology and hardware.",
        "Direct the lifecycle decommissioning and disposition of obsolete communications equipment, processing all transactions in the ERP system in strict compliance with regulatory and environmental standards.",
      ],
    },
    {
      lines: ["YOUR POSITION TITLE | COMPANY NAME, LOCATION  OCT 2024 – JAN 2026"],
      bullets: [
        "Supported development of long-range programs for ARNG administrative, logistics, maintenance, and training facilities.",
        "Provided guidance on facilities operations, and recommended preventive maintenance strategies to reduce downtime and extend asset life.",
        "Drafted initial plans and specifications for alterations/repairs; resolved technical issues using historical data analysis.",
      ],
    },
    {
      lines: ["YOUR POSITION TITLE | COMPANY NAME, LOCATION  JAN 2023 – OCT 2024"],
      bullets: [
        "Ensured 100% real-time inventory accuracy and streamlined order processing by expertly utilizing WMS to track movements, process orders, and update shipment records.",
        "Analyzed shipment priorities and coordinated driver assignments, directly contributing to a 15% reduction in loading delays and improving overall facility throughput.",
        "Develop and implement operational strategies that improved productivity by 25% and reduced costs by 18%.",
        "Audited all shipping and receiving documentation for accuracy, preventing costly data errors and improving dock-to-stock turnaround time.",
        "Collaborated with warehouse, transportation, and external logistics partners to troubleshoot issues, guarantee timely deliveries, and enhance end-to-end service delivery",
      ],
    },
  ],
  education: [
    { lines: ["Bachelor of Business Administration in Supply Chain | Name of University  DEC 2025"], bullets: [] },
    { lines: ["OSHA 30-Hour General Industry Safety and Health Certification  AUG 2025"], bullets: [] },
    { lines: ["Lean Six Sigma Green Belt Certification  JUN 2025"], bullets: [] },
  ],
  projects: [],
  certifications: [],
  skills: [
    "Inventory Management", "Logistics Scheduling", "Preventive Maintenance", "Property Accountability",
    "Surplus Property Management", "SAP", "Accellos WMS", "Excel (Pivot Tables, VLOOKUP, INDEX/MATCH)",
    "Spanish", "English",
  ],
};