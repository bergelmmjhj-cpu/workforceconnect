import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { WorkerApplication } from "../../shared/schema";
import {
  NON_SOLICITATION_DIRECT_HIRING_CLAUSE_TITLE,
  WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION,
  workforceSubcontractorAgreementSections,
} from "../../shared/contractor-guide-content";

export type AgreementPdfVariant = "internal" | "worker";

const INTERNAL_COMPANY_NAME = "1001328662 Ontario Inc.";
const INTERNAL_COMPANY_ADDRESS = "Mississauga, Ontario";

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
  void variant;

  doc.fontSize(18).font("Helvetica-Bold").text(INTERNAL_COMPANY_NAME, { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(10).font("Helvetica").fillColor("#555555").text(INTERNAL_COMPANY_ADDRESS, { align: "center" });
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

function addAcknowledgments(doc: PDFDocument, _application: WorkerApplication) {
  const items = [
    "TITO System Acknowledgment",
    "Site Rules Agreement",
    NON_SOLICITATION_DIRECT_HIRING_CLAUSE_TITLE,
    "Worker Agreement",
    "Privacy Policy",
  ] as const;

  doc.fontSize(12).font("Helvetica-Bold").text("Acknowledgments");
  doc.moveDown(0.35);
  items.forEach((label) => {
    doc.fontSize(9.5).font("Helvetica").text(`[X] ${label}`);
    doc.moveDown(0.2);
  });
}

function addSignature(doc: PDFDocument, application: WorkerApplication) {
  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica-Bold").text("Signature");
  doc.moveDown(0.4);
  addLabelValue(doc, "Signed By:", application.signature);
  addLabelValue(doc, "Signed Date:", application.signatureDate);
  addLabelValue(doc, "Application Submitted:", new Date(application.createdAt).toLocaleDateString("en-CA"));
  addLabelValue(doc, "Agreement Version:", application.agreementVersion || WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION);
  addLabelValue(doc, "Non-Solicitation Acknowledged:", "Yes");
  addLabelValue(
    doc,
    "Acknowledged At:",
    application.nonSolicitationAcknowledgedAt ? new Date(application.nonSolicitationAcknowledgedAt).toLocaleString("en-CA") : "Legacy / Unknown",
  );
}

export function createAgreementPdfFileName(application: WorkerApplication, variant: AgreementPdfVariant): string {
  const date = new Date().toISOString().split("T")[0];
  const name = sanitizeFileName(application.fullName || "Worker");
  if (variant === "worker") {
    return `Worker_Agreement_${name}_${date}.pdf`;
  }
  return `Internal_Subcontractor_Agreement_${name}_${date}.pdf`;
}

export function streamAgreementPdf(res: Response, application: WorkerApplication, variant: AgreementPdfVariant) {
  const fileName = createAgreementPdfFileName(application, variant);
  const doc = new PDFDocument({ size: "LETTER", margins: { top: 50, bottom: 50, left: 56, right: 56 } });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
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
  addSignature(doc, application);

  void variant;

  doc.end();
}