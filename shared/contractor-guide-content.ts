/**
 * Contractor Payment & Processing Guide Content
 * 
 * This is the SINGLE SOURCE OF TRUTH for all contractor payment policies.
 * Used by both the mobile app (SubcontractorNoticeScreen) and the public guide website.
 * 
 * DO NOT duplicate this content - import from this module instead.
 */

export interface ContractorGuideSection {
  id: string;
  title: string;
  content: string[];
  bullets?: { text: string; bold?: boolean }[];
  subSections?: {
    title: string;
    bullets: { text: string; bold?: boolean }[];
  }[];
  highlight?: { type: "warning" | "error" | "info"; text: string };
}

export interface ContractorGuideContent {
  pageTitle: string;
  lastUpdated: string;
  version: string;
  introText: string;
  sections: ContractorGuideSection[];
  contactInfo: {
    email: string;
    phone: string;
    website: string;
  };
  departments?: {
    name: string;
    phone: string;
  }[];
}

export const contractorGuideContent: ContractorGuideContent = {
  pageTitle: "Contractor Payment & Processing Guide",
  lastUpdated: "2026-01-24",
  version: "v2.0",
  introText:
    "All individuals providing services through Workforce Connect do so strictly as independent subcontractors, not as employees. This guide outlines your work status, payment structure, and important policies.",

  sections: [
    {
      id: "work-status",
      title: "1. Work Status (Independent Subcontractor)",
      content: [
        "All individuals providing services through Workforce Connect do so as independent subcontractors.",
        "This means:",
      ],
      bullets: [
        { text: "You are NOT an employee", bold: true },
        { text: "You are NOT on payroll", bold: true },
        { text: "You do NOT receive employee benefits", bold: true },
        {
          text: "You invoice Workforce Connect based on completed and approved work",
          bold: false,
        },
      ],
      subSections: [
        {
          title: "Because of this:",
          bullets: [
            { text: "NO CPP deductions", bold: true },
            { text: "NO EI deductions", bold: true },
            { text: "NO income tax deductions", bold: true },
          ],
        },
      ],
      highlight: {
        type: "warning",
        text: "You are fully responsible for declaring your income and paying all applicable taxes to the Canada Revenue Agency (CRA).",
      },
    },
    {
      id: "pay-cycle",
      title: "2. Pay Cycle & Release Timing",
      content: [
        "Hotel-based work follows a bi-weekly reporting period.",
        "However, payment is NOT released based on calendar dates.",
        "Payments are issued only after:",
      ],
      bullets: [
        {
          text: "Workforce Connect receives payment from the hotel or janitorial client",
          bold: false,
        },
      ],
      subSections: [
        {
          title: "Payment timing may vary depending on:",
          bullets: [
            { text: "Client accounting schedules", bold: false },
            { text: "Bank settlement timelines", bold: false },
            { text: "Holidays", bold: false },
            { text: "System maintenance or operational delays", bold: false },
          ],
        },
      ],
      highlight: {
        type: "info",
        text: "Once client funds are received and cleared, your payment will be processed and released immediately. For transparency, proof of client payment may be requested for verification.",
      },
    },
    {
      id: "payment-methods",
      title: "3. Payment Methods",
      content: [
        "Workforce Connect supports ONLY the following payment methods:",
      ],
      subSections: [
        {
          title: "A. Direct Deposit (EFT)",
          bullets: [{ text: "Requires a valid void cheque", bold: false }],
        },
        {
          title: "B. Interac E-Transfer",
          bullets: [
            { text: "Subject to bank-imposed sending limits", bold: false },
          ],
        },
        {
          title: "C. Company Cheque",
          bullets: [
            { text: "Available only to GTA-based subcontractors", bold: false },
          ],
        },
      ],
    },
    {
      id: "payment-info",
      title: "4. Payment Information Requirements",
      content: [
        "You cannot be paid until your payment details are properly registered.",
        "Please complete the official Payment Information Form provided by Workforce Connect.",
      ],
      highlight: {
        type: "error",
        text: "Incorrect or missing payment information will result in payment delays.",
      },
    },
    {
      id: "no-guaranteed-date",
      title: "5. No Guaranteed Payment Date",
      content: ["The Subcontractor understands and agrees that:"],
      bullets: [
        { text: "There is NO guaranteed pay date", bold: true },
        {
          text: "Payment release depends entirely on Client remittance",
          bold: false,
        },
        {
          text: "Workforce Connect is not responsible for delays caused by Clients or banking institutions",
          bold: false,
        },
      ],
    },
    {
      id: "timekeeping",
      title: "6. Timekeeping & Verification (TITO)",
      content: [],
      bullets: [
        {
          text: "The Subcontractor must accurately submit Time-In / Time-Out (TITO) records through the Workforce Connect platform.",
          bold: false,
        },
        {
          text: "Server-recorded UTC timestamps are authoritative. Corrections require valid justification.",
          bold: false,
        },
        {
          text: "Coarse location data or simple verification methods (checkbox or typed name) may be required for audit and client verification purposes.",
          bold: false,
        },
      ],
      highlight: {
        type: "warning",
        text: "Falsification of time records may result in immediate termination of access to the platform.",
      },
    },
    {
      id: "contact",
      title: "7. Who to Contact",
      content: [
        "For questions about your payment status, payment information updates, or general inquiries:",
      ],
    },
    {
      id: "accounting-rules",
      title: "8. Accounting Rules Summary",
      content: [],
      bullets: [
        {
          text: "All payments are processed in Canadian Dollars (CAD)",
          bold: false,
        },
        {
          text: "Bi-weekly reporting period for hotel-based work",
          bold: false,
        },
        { text: "Payment released only after client payment received", bold: true },
        { text: "No payroll deductions (CPP, EI, income tax)", bold: true },
        {
          text: "Subcontractor responsible for all tax reporting to CRA",
          bold: false,
        },
        { text: "Keep records of all work completed and payments received", bold: false },
      ],
    },
  ],

  contactInfo: {
    email: "payroll@wfconnect.org",
    phone: "(416) 555-0100",
    website: "https://wfconnect.org",
  },

  departments: [
    { name: "Sales Department", phone: "(289) 670-5697" },
    { name: "Accounting Department", phone: "(437) 476-2418" },
    { name: "HR Department", phone: "(437) 476-9566" },
  ],
};

/**
 * Get the guide content as JSON (for API endpoints)
 */
export function getContractorGuideJSON(): ContractorGuideContent {
  return contractorGuideContent;
}

/**
 * Get a specific section by ID
 */
export function getGuideSection(sectionId: string): ContractorGuideSection | undefined {
  return contractorGuideContent.sections.find((s) => s.id === sectionId);
}
