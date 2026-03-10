import { sendEmail } from "../email";

const ADMIN_EMAIL = "admin@wfconnect.org";
const APP_URL = "https://app.wfconnect.org";

export interface AlertResult {
  success: boolean;
  error?: string;
}

export async function sendContactLeadAlert(lead: {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  cityProvince?: string | null;
  serviceNeeded?: string | null;
  message: string;
  createdAt: Date;
}): Promise<AlertResult> {
  const subject = `New client inquiry — ${lead.name}${lead.company ? ` (${lead.company})` : ""}`;
  const text = [
    `New contact form submission received on WFConnect.`,
    ``,
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    lead.company ? `Company: ${lead.company}` : null,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.cityProvince ? `Location: ${lead.cityProvince}` : null,
    lead.serviceNeeded ? `Service Needed: ${lead.serviceNeeded}` : null,
    ``,
    `Message:`,
    lead.message,
    ``,
    `Received: ${lead.createdAt.toLocaleString("en-CA", { timeZone: "America/Toronto" })}`,
    ``,
    `Review at: ${APP_URL}`,
  ].filter((l) => l !== null).join("\n");

  const html = `
    <h2 style="color:#1E40AF">New Client Inquiry</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px">
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;width:140px">Name</td><td style="padding:6px 0"><strong>${lead.name}</strong></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B">Email</td><td style="padding:6px 0">${lead.email}</td></tr>
      ${lead.company ? `<tr><td style="padding:6px 12px 6px 0;color:#64748B">Company</td><td style="padding:6px 0">${lead.company}</td></tr>` : ""}
      ${lead.phone ? `<tr><td style="padding:6px 12px 6px 0;color:#64748B">Phone</td><td style="padding:6px 0">${lead.phone}</td></tr>` : ""}
      ${lead.cityProvince ? `<tr><td style="padding:6px 12px 6px 0;color:#64748B">Location</td><td style="padding:6px 0">${lead.cityProvince}</td></tr>` : ""}
      ${lead.serviceNeeded ? `<tr><td style="padding:6px 12px 6px 0;color:#64748B">Service Needed</td><td style="padding:6px 0">${lead.serviceNeeded}</td></tr>` : ""}
    </table>
    <h3 style="color:#1E40AF;margin-top:20px">Message</h3>
    <p style="background:#F8FAFC;padding:16px;border-radius:8px;border-left:4px solid #1E40AF">${lead.message.replace(/\n/g, "<br>")}</p>
    <p style="color:#64748B;font-size:13px">Received: ${lead.createdAt.toLocaleString("en-CA", { timeZone: "America/Toronto" })}</p>
    <a href="${APP_URL}" style="background:#1E40AF;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px">Open WFConnect</a>
  `;

  return sendEmail({ to: ADMIN_EMAIL, subject, text, html });
}

export async function sendShiftRequestAlert(request: {
  id: string;
  roleType: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
  createdAt: Date;
}, escalated: boolean): Promise<AlertResult> {
  const age = Math.round((Date.now() - request.createdAt.getTime()) / 60000);
  const prefix = escalated ? "URGENT — " : "";
  const subject = `${prefix}Shift request needs attention — ${request.roleType} on ${request.date}`;

  const text = [
    escalated ? "URGENT: This shift request has been open for over 4 hours without a worker assigned." : "A shift request has been open for over 30 minutes without a worker assigned.",
    ``,
    `Role: ${request.roleType}`,
    `Date: ${request.date}`,
    `Time: ${request.startTime} – ${request.endTime}`,
    request.notes ? `Notes: ${request.notes}` : null,
    `Submitted: ${request.createdAt.toLocaleString("en-CA", { timeZone: "America/Toronto" })} (${age} min ago)`,
    ``,
    `Action required: Assign a worker or follow up with the client.`,
    ``,
    `Review at: ${APP_URL}`,
  ].filter((l) => l !== null).join("\n");

  const urgentStyle = escalated ? "color:#EF4444" : "color:#F59E0B";
  const html = `
    <h2 style="${urgentStyle}">${escalated ? "URGENT: " : ""}Shift Request Needs Attention</h2>
    <p>${escalated ? "This request has been open for <strong>over 4 hours</strong> without a worker assigned." : "A shift request has been open for <strong>over 30 minutes</strong> without a worker assigned."}</p>
    <table style="border-collapse:collapse;width:100%;max-width:600px">
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;width:140px">Role</td><td style="padding:6px 0"><strong>${request.roleType}</strong></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B">Date</td><td style="padding:6px 0">${request.date}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B">Time</td><td style="padding:6px 0">${request.startTime} – ${request.endTime}</td></tr>
      ${request.notes ? `<tr><td style="padding:6px 12px 6px 0;color:#64748B">Notes</td><td style="padding:6px 0">${request.notes}</td></tr>` : ""}
      <tr><td style="padding:6px 12px 6px 0;color:#64748B">Submitted</td><td style="padding:6px 0">${request.createdAt.toLocaleString("en-CA", { timeZone: "America/Toronto" })} (${age} min ago)</td></tr>
    </table>
    <p style="font-weight:600;margin-top:16px">Action required: Assign a worker or follow up with the client.</p>
    <a href="${APP_URL}" style="background:#1E40AF;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px">Open WFConnect</a>
  `;

  return sendEmail({ to: ADMIN_EMAIL, subject, text, html });
}

export async function sendUnfilledShiftAlert(shift: {
  id: string;
  title?: string | null;
  date: string;
  startTime: string;
  endTime?: string | null;
}): Promise<AlertResult> {
  const subject = `URGENT — Unfilled shift starting within 4 hours — ${shift.date} at ${shift.startTime}`;

  const text = [
    `A scheduled shift has no worker assigned and starts within the next 4 hours.`,
    ``,
    `Date: ${shift.date}`,
    `Start: ${shift.startTime}`,
    shift.endTime ? `End: ${shift.endTime}` : null,
    shift.title ? `Title: ${shift.title}` : null,
    ``,
    `Immediate action required: Assign a worker now.`,
    ``,
    `Review at: ${APP_URL}`,
  ].filter((l) => l !== null).join("\n");

  const html = `
    <h2 style="color:#EF4444">URGENT: Unfilled Shift Starting Soon</h2>
    <p>A scheduled shift has <strong>no worker assigned</strong> and starts within the next 4 hours.</p>
    <table style="border-collapse:collapse;width:100%;max-width:600px">
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;width:140px">Date</td><td style="padding:6px 0"><strong>${shift.date}</strong></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B">Start Time</td><td style="padding:6px 0"><strong>${shift.startTime}</strong></td></tr>
      ${shift.endTime ? `<tr><td style="padding:6px 12px 6px 0;color:#64748B">End Time</td><td style="padding:6px 0">${shift.endTime}</td></tr>` : ""}
      ${shift.title ? `<tr><td style="padding:6px 12px 6px 0;color:#64748B">Title</td><td style="padding:6px 0">${shift.title}</td></tr>` : ""}
    </table>
    <p style="font-weight:600;color:#EF4444;margin-top:16px">Immediate action required: Assign a worker now.</p>
    <a href="${APP_URL}" style="background:#EF4444;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px">Open WFConnect — Assign Now</a>
  `;

  return sendEmail({ to: ADMIN_EMAIL, subject, text, html });
}

export async function sendPendingAccountsDigest(pendingUsers: {
  count: number;
  workerCount: number;
  clientCount: number;
  oldest: Date | null;
}): Promise<AlertResult> {
  const subject = `Daily digest — ${pendingUsers.count} account${pendingUsers.count !== 1 ? "s" : ""} pending approval`;

  const oldestStr = pendingUsers.oldest
    ? pendingUsers.oldest.toLocaleDateString("en-CA", { timeZone: "America/Toronto" })
    : "unknown";

  const text = [
    `Daily pending accounts digest from WFConnect.`,
    ``,
    `Pending accounts awaiting activation: ${pendingUsers.count}`,
    `  Workers: ${pendingUsers.workerCount}`,
    `  Clients: ${pendingUsers.clientCount}`,
    `  Oldest pending since: ${oldestStr}`,
    ``,
    `Review and approve at: ${APP_URL}`,
  ].join("\n");

  const html = `
    <h2 style="color:#1E40AF">Daily Pending Accounts Digest</h2>
    <p>The following accounts are awaiting admin activation in WFConnect:</p>
    <table style="border-collapse:collapse;width:100%;max-width:600px">
      <tr><td style="padding:6px 12px 6px 0;color:#64748B;width:180px">Total Pending</td><td style="padding:6px 0"><strong>${pendingUsers.count}</strong></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B">Workers</td><td style="padding:6px 0">${pendingUsers.workerCount}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B">Clients</td><td style="padding:6px 0">${pendingUsers.clientCount}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748B">Oldest pending since</td><td style="padding:6px 0">${oldestStr}</td></tr>
    </table>
    <a href="${APP_URL}" style="background:#1E40AF;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px">Review Pending Accounts</a>
  `;

  return sendEmail({ to: ADMIN_EMAIL, subject, text, html });
}
