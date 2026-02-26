// SendGrid integration for sending emails with attachments
import sgMail from '@sendgrid/mail';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email };
}

// WARNING: Never cache this client.
export async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

interface EmailAttachment {
  content: string;
  filename: string;
  type: string;
  disposition?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    const msg: any = {
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      text: options.text,
    };

    if (options.html) {
      msg.html = options.html;
    }

    if (options.attachments && options.attachments.length > 0) {
      msg.attachments = options.attachments.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.type,
        disposition: att.disposition || 'attachment',
      }));
    }

    await client.send(msg);
    console.log(`[EMAIL] Sent to ${options.to}: ${options.subject}`);
    return { success: true };
  } catch (error: any) {
    console.error("[EMAIL] Send error:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send email" };
  }
}

export async function sendCSVEmail(
  to: string,
  subject: string,
  bodyText: string,
  csvContent: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  const base64Content = Buffer.from(csvContent).toString('base64');

  return sendEmail({
    to,
    subject,
    text: bodyText,
    attachments: [{
      content: base64Content,
      filename,
      type: 'text/csv',
    }],
  });
}

export async function sendXLSXEmail(
  to: string,
  subject: string,
  bodyText: string,
  xlsxBuffer: Buffer,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  const base64Content = xlsxBuffer.toString('base64');

  return sendEmail({
    to,
    subject,
    text: bodyText,
    attachments: [{
      content: base64Content,
      filename,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }],
  });
}
