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

export interface AgreementSection {
  id: string;
  title: string;
  paragraphs: string[];
}

export const WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION = "v3.0";
export const WORKFORCE_SUBCONTRACTOR_AGREEMENT_EFFECTIVE_DATE = "2026-04-06";

export const NON_SOLICITATION_DIRECT_HIRING_CLAUSE_TITLE = "Non-Solicitation / Direct Hiring Clause";

export const NON_SOLICITATION_DIRECT_HIRING_CLAUSE_PARAGRAPHS = [
  "The Contractor agrees that during the term of this Agreement and for a period of twelve (12) months following the completion or termination of any assignment, they shall not, directly or indirectly, solicit or accept employment, contract work, or any other form of engagement with any client of the Company to whom the Contractor was introduced or for whom the Contractor performed services under this Agreement, without the prior written consent of the Company.",
  "For greater certainty, this restriction applies only to clients with whom the Contractor had direct contact or to whom the Contractor was assigned during the course of their engagement with the Company.",
  "This restriction applies regardless of whether such opportunity is initiated by the Contractor, the client, or any third party.",
  "In the event that the Contractor accepts such employment or engagement without the Company’s prior written consent, the Contractor agrees to pay the Company a placement fee equivalent to three (3) months of full-time hours calculated at the Contractor’s most recent agreed hourly rate. The parties acknowledge and agree that this amount represents a genuine pre-estimate of damages and is not intended to be a penalty.",
  "The Contractor acknowledges that the duration, scope, and nature of this clause are reasonable and necessary to protect the Company’s legitimate business interests, including its client relationships and investment in securing and maintaining such clients.",
];

export const workforceSubcontractorAgreementSections: AgreementSection[] = [
  {
    id: "parties",
    title: "1. Parties",
    paragraphs: [
      "This Subcontractor Agreement is entered into between 1001328662 Ontario Inc. (the \"Company\") and the worker identified in the signature section of this Agreement (the \"Contractor\").",
      "This Agreement applies to worker-facing and internal copies and references the Company’s legal entity for administrative and legal record purposes.",
    ],
  },
  {
    id: "relationship",
    title: "2. Independent Contractor Relationship",
    paragraphs: [
      "The Contractor performs services as an independent subcontractor and not as an employee, agent, partner, or representative of the Company unless required by applicable law.",
      "The Contractor understands that they are not entitled to Employment Insurance, Canada Pension Plan contributions, vacation pay, overtime pay, benefits, or any similar employee entitlements unless expressly required by law.",
      "The Contractor is solely responsible for filing and remitting all taxes, source deductions, premiums, and statutory contributions arising from amounts paid under this Agreement.",
    ],
  },
  {
    id: "scope",
    title: "3. Scope of Services",
    paragraphs: [
      "The Company may offer assignments involving housekeeping, hotel cleaning, supervisor coverage, banquet and server roles, and other temporary hospitality staffing services requested by Company clients.",
      "The Contractor agrees to perform only assignments they accept and to carry out accepted assignments in a professional, safe, and client-compliant manner.",
    ],
  },
  {
    id: "assignment-terms",
    title: "4. Assignment Terms",
    paragraphs: [
      "The Contractor acknowledges that no minimum hours, recurring shifts, or ongoing assignments are guaranteed under this Agreement.",
      "Assignments are based on client demand, may vary by location, role, and duration, and may be reassigned, rescheduled, shortened, or cancelled by the Company or the client.",
    ],
  },
  {
    id: "compensation",
    title: "5. Compensation",
    paragraphs: [
      "The Contractor will be paid the hourly rate communicated for the accepted assignment, subject to client-specific rates, approved hours, and compliance with Company procedures.",
      "Only hours that are properly submitted, verified, and approved are payable. Payroll processing follows the Company’s then-current payroll cycle and operational procedures.",
    ],
  },
  {
    id: "timekeeping",
    title: "6. Timekeeping / TITO",
    paragraphs: [
      "The Contractor must accurately record all time in and time out events through the Company’s designated TITO or timekeeping tools.",
      "GPS, geofence, device, or related location verification may be used for attendance validation. Buddy punching, fabricated timestamps, or any other false recordkeeping is prohibited.",
      "Fraudulent or inaccurate timekeeping may result in assignment removal, termination of this Agreement, and non-payment for unverified or falsified hours where permitted by law.",
    ],
  },
  {
    id: "confidentiality",
    title: "7. Confidentiality",
    paragraphs: [
      "The Contractor shall keep confidential all non-public information obtained through the Company or its clients, including hotel guest data, room information, schedules, client data, staff details, and Company operating processes.",
      "The Contractor shall not use or disclose confidential information except as necessary to perform an assignment or as required by law.",
    ],
  },
  {
    id: "non-solicitation",
    title: "8. Non-Solicitation / Direct Hiring Clause",
    paragraphs: NON_SOLICITATION_DIRECT_HIRING_CLAUSE_PARAGRAPHS,
  },
  {
    id: "conduct",
    title: "9. Conduct and Site Compliance",
    paragraphs: [
      "The Contractor must comply with dress code standards, professionalism requirements, client policies, safety rules, anti-harassment obligations, and all reasonable directions relating to conduct at a site.",
      "Photography, recording, or social posting regarding client premises, guest areas, staff, schedules, or operations is prohibited unless expressly authorized in writing.",
    ],
  },
  {
    id: "equipment",
    title: "10. Equipment / Damages",
    paragraphs: [
      "The Contractor is responsible for exercising reasonable care with Company and client property, equipment, uniforms, keys, and keycards issued for an assignment.",
      "The Contractor may be held responsible, to the extent permitted by law, for losses or damages caused by negligence, including lost keycards, access devices, or client property damage.",
    ],
  },
  {
    id: "termination",
    title: "11. Termination",
    paragraphs: [
      "The Company may suspend or terminate assignments or this Agreement for misconduct, attendance issues, client complaints, falsified TITO records, breach of confidentiality, or breach of the Non-Solicitation / Direct Hiring Clause.",
      "The Contractor may stop accepting new assignments at any time, subject to completing accepted work unless otherwise released by the Company or client.",
    ],
  },
  {
    id: "governing-law",
    title: "12. Governing Law",
    paragraphs: [
      "This Agreement shall be governed by and interpreted in accordance with the laws of the Province of Ontario and the federal laws of Canada applicable therein.",
    ],
  },
  {
    id: "electronic-signature",
    title: "13. Electronic Signature",
    paragraphs: [
      "The parties agree that an electronic signature, typed name, electronic acknowledgment, and electronically stored acceptance record are intended to be legally binding and enforceable to the same extent as an original handwritten signature.",
    ],
  },
];

export function getNonSolicitationDirectHiringClauseText(): string {
  return [NON_SOLICITATION_DIRECT_HIRING_CLAUSE_TITLE, "", ...NON_SOLICITATION_DIRECT_HIRING_CLAUSE_PARAGRAPHS].join("\n\n");
}

export function getWorkforceSubcontractorAgreementBodyText(): string {
  return workforceSubcontractorAgreementSections
    .map((section) => [section.title, ...section.paragraphs].join("\n\n"))
    .join("\n\n");
}

export const contractorGuideContent: ContractorGuideContent = {
  pageTitle: "Contractor Payment & Processing Guide",
  lastUpdated: "2026-01-24",
  version: "v2.0",
  introText:
    "All individuals providing services through the Company do so strictly as independent subcontractors, not as employees. This guide outlines your work status, payment structure, and important policies.",

  sections: [
    {
      id: "work-status",
      title: "1. Work Status (Independent Subcontractor)",
      content: [
        "All individuals providing services through the Company do so as independent subcontractors.",
        "This means:",
      ],
      bullets: [
        { text: "You are NOT an employee", bold: true },
        { text: "You are NOT on payroll", bold: true },
        { text: "You do NOT receive employee benefits", bold: true },
        {
          text: "You invoice the Company based on completed and approved work",
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
          text: "The Company receives payment from the hotel or janitorial client",
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
        "The Company supports ONLY the following payment methods:",
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
        "Please complete the official Payment Information Form provided by the Company.",
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
          text: "The Company is not responsible for delays caused by Clients or banking institutions",
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
          text: "The Subcontractor must accurately submit Time-In / Time-Out (TITO) records through the designated platform.",
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
    email: "payroll@company.ca",
    phone: "(416) 555-0100",
    website: "/",
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
