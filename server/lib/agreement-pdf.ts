import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { WorkerApplication } from "../../shared/schema";
import {
  NON_SOLICITATION_DIRECT_HIRING_CLAUSE_TITLE,
  WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION,
  workforceSubcontractorAgreementSections,
} from "../../shared/contractor-guide-content";
import { logMissingPaymentIfNeeded, resolveAcknowledgmentFields, resolvePaymentFields } from "./worker-application-resolution";

export type AgreementPdfVariant = "internal" | "worker";
type PdfDisposition = "attachment" | "inline";

const INTERNAL_COMPANY_NAME = "1001328662 Ontario Inc.";
const INTERNAL_COMPANY_ADDRESS = "1900 Dundas St. West, Mississauga L5K 1P9";
const WORKER_COMPANY_NAME = "Workforce Connect";
const WORKER_COMPANY_ADDRESS = "Mississauga, Ontario";

function safeParseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return [String(value)];
  }
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_.-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "Agreement";
}

function drawHeader(doc: PDFDocument, variant: AgreementPdfVariant) {
  const companyName = variant === "worker" ? WORKER_COMPANY_NAME : INTERNAL_COMPANY_NAME;
  const companyAddress = variant === "worker" ? WORKER_COMPANY_ADDRESS : INTERNAL_COMPANY_ADDRESS;

  doc.fontSize(18).font("Helvetica-Bold").text(companyName, { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(10).font("Helvetica").fillColor("#555555").text(companyAddress, { align: "center" });
  doc.fillColor("#000000");

  doc.moveDown(1.2);
  doc.fontSize(17).font("Helvetica-Bold").text("Subcontractor Agreement", { align: "center" });
  doc.moveDown(0.25);
  doc.fontSize(9).font("Helvetica").fillColor("#666666").text(`Agreement Version ${WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION}`, { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(1);
}

function addLabelValue(doc: PDFDocument, label: string, value: string | null | undefined) {
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#444444").text(label, { continued: true });
  doc.font("Helvetica").fillColor("#000000").text(` ${value || "N/A"}`);
  doc.moveDown(0.2);
}

function addSection(doc: PDFDocument, title: string, paragraphs: string[]) {
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text(title);
  doc.moveDown(0.35);
  paragraphs.forEach((paragraph) => {
    doc.fontSize(9.5).font("Helvetica").text(paragraph, { lineGap: 2 });
    doc.moveDown(0.35);
  });
}

function isAccepted(value: unknown): boolean {
  return value === true;
}

function addAcknowledgments(doc: PDFDocument, application: WorkerApplication) {
  const resolved = resolveAcknowledgmentFields(application as unknown as Record<string, unknown>);

  const items: Array<{ label: string; accepted: boolean }> = [
    { label: "Background Check Consent", accepted: isAccepted(resolved.backgroundCheckConsent) },
    { label: "TITO System Acknowledgment", accepted: isAccepted(resolved.titoAcknowledgment) },
    { label: "Site Rules Agreement", accepted: isAccepted(resolved.siteRulesAcknowledgment) },
    { label: NON_SOLICITATION_DIRECT_HIRING_CLAUSE_TITLE, accepted: isAccepted(resolved.nonSolicitationAcknowledged) },
    { label: "Worker Agreement", accepted: isAccepted(resolved.workerAgreementConsent) },
    { label: "Privacy Policy", accepted: isAccepted(resolved.privacyConsent) },
    { label: "Consent To Contact", accepted: isAccepted(resolved.consentToContact) },
  ];

  if (resolved.marketingConsent === true) {
    items.push({ label: "Promotional Communications (Optional)", accepted: true });
  }

  doc.fontSize(12).font("Helvetica-Bold").text("Acknowledgments");
  doc.moveDown(0.35);
  items.forEach((item) => {
    doc.fontSize(9.5).font("Helvetica").text(`[${item.accepted ? "X" : " "}] ${item.label}`);
    doc.moveDown(0.2);
  });
}

function resolveAcknowledgedAtValue(application: WorkerApplication): string {
  if (application.nonSolicitationAcknowledgedAt) {
    return new Date(application.nonSolicitationAcknowledgedAt).toLocaleString("en-CA");
  }

  if (application.nonSolicitationAcknowledged === true && application.signatureDate) {
    const parsed = new Date(application.signatureDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("en-CA");
    }
  }

  return "Not recorded";
}

function addPaymentInformation(doc: PDFDocument, application: WorkerApplication, variant: AgreementPdfVariant) {
  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica-Bold").text("Payment Information");
  doc.moveDown(0.4);

  const resolved = resolvePaymentFields(application as unknown as Record<string, unknown>);
  if (!resolved.paymentMethod && !resolved.bankName && !resolved.bankInstitution && !resolved.bankTransit && !resolved.bankAccount && !resolved.etransferEmail) {
    logMissingPaymentIfNeeded(application.id, variant);
  }

  const paymentMethod = resolved.paymentMethod || "Not provided";
  addLabelValue(doc, "Payment Method:", paymentMethod);
  addLabelValue(doc, "Bank Name:", resolved.bankName || "Not provided");
  addLabelValue(doc, "Institution Number:", resolved.bankInstitution || "Not provided");
  addLabelValue(doc, "Transit Number:", resolved.bankTransit || "Not provided");
  addLabelValue(doc, "Account Number:", resolved.bankAccount ? `******${String(resolved.bankAccount).replace(/\D/g, "").slice(-4)}` : "Not provided");
  addLabelValue(doc, "E-Transfer Email:", resolved.etransferEmail || "Not provided");
}

function addSignature(doc: PDFDocument, application: WorkerApplication) {
  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica-Bold").text("Signature");
  doc.moveDown(0.4);
  addLabelValue(doc, "Signed By:", application.signature);
  addLabelValue(doc, "Signed Date:", application.signatureDate);
  addLabelValue(doc, "Application Submitted:", new Date(application.createdAt).toLocaleDateString("en-CA"));
  addLabelValue(doc, "Agreement Version:", application.agreementVersion || WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION);
  addLabelValue(doc, "Non-Solicitation Acknowledged:", application.nonSolicitationAcknowledged ? "Yes" : "No");
  addLabelValue(doc, "Acknowledged At:", resolveAcknowledgedAtValue(application));
}

export function createAgreementPdfFileName(application: WorkerApplication, variant: AgreementPdfVariant): string {
  const date = new Date().toISOString().split("T")[0];
  const name = sanitizeFileName(application.fullName || "Worker");
  if (variant === "worker") {
    return `Worker_Agreement_${name}_${date}.pdf`;
  }
  return `Internal_Subcontractor_Agreement_${name}_${date}.pdf`;
}

export function streamAgreementPdf(
  res: Response,
  application: WorkerApplication,
  variant: AgreementPdfVariant,
  options?: { disposition?: PdfDisposition },
) {
  const fileName = createAgreementPdfFileName(application, variant);
  const disposition: PdfDisposition = options?.disposition === "inline" ? "inline" : "attachment";
  const doc = new PDFDocument({ size: "LETTER", margins: { top: 50, bottom: 50, left: 56, right: 56 } });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${disposition}; filename="${fileName}"`);
  doc.pipe(res);

  drawHeader(doc, variant);

  addSection(doc, "Worker Details", [
    `Contractor: ${application.fullName}`,
    `Email: ${application.email}`,
    `Phone: ${application.phone}`,
    `Address: ${application.address}, ${application.city}, ${application.province} ${application.postalCode}`,
  ]);

  addSection(doc, "Assignment Profile", [
    `Preferred Roles: ${safeParseList(application.preferredRoles).join(", ") || "Not specified"}`,
    `Available Days: ${safeParseList(application.availableDays).join(", ") || "Not specified"}`,
    `Preferred Shifts: ${safeParseList(application.preferredShifts).join(", ") || "Not specified"}`,
  ]);

  workforceSubcontractorAgreementSections.forEach((section, index) => {
    if (doc.y > 690) {
      doc.addPage();
    }
    addSection(doc, section.title, section.paragraphs);
    if (index === 4) {
      addSection(doc, "Compensation Details", [
        `Most recent rate basis: ${application.yearsExperience || "Client-dependent hourly rate"}`,
        "Approved hours only will be processed for payment.",
      ]);
    }
  });

  addAcknowledgments(doc, application);
  addPaymentInformation(doc, application, variant);
  addSignature(doc, application);

  doc.end();
}