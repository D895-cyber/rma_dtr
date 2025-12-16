import nodemailer from 'nodemailer';

const {
  GMAIL_OAUTH_CLIENT_ID,
  GMAIL_OAUTH_CLIENT_SECRET,
  GMAIL_OAUTH_REFRESH_TOKEN,
  GMAIL_OAUTH_USER,
} = process.env;

// Basic guard so app won't crash if email is not configured
const emailEnabled =
  !!GMAIL_OAUTH_CLIENT_ID &&
  !!GMAIL_OAUTH_CLIENT_SECRET &&
  !!GMAIL_OAUTH_REFRESH_TOKEN &&
  !!GMAIL_OAUTH_USER;

const transporter = emailEnabled
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: GMAIL_OAUTH_USER,
        clientId: GMAIL_OAUTH_CLIENT_ID,
        clientSecret: GMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: GMAIL_OAUTH_REFRESH_TOKEN,
      },
    })
  : null;

export interface AssignmentEmailPayload {
  to: string;
  engineerName?: string | null;
  caseType: 'DTR' | 'RMA';
  caseNumber: string;
  createdBy?: string | null;
  link?: string;
}

export async function sendAssignmentEmail(payload: AssignmentEmailPayload) {
  if (!emailEnabled || !transporter) {
    console.warn('Email not sent: Gmail OAuth2 env vars not configured');
    return;
  }

  const subject = `[${payload.caseType}] New Case Assigned - #${payload.caseNumber}`;
  const greetingName = payload.engineerName || 'Engineer';

  const textLines = [
    `Hi ${greetingName},`,
    '',
    `You have been assigned a new ${payload.caseType} case.`,
    `Case Number: ${payload.caseNumber}`,
    payload.createdBy ? `Created By: ${payload.createdBy}` : '',
    payload.link ? `Link: ${payload.link}` : '',
    '',
    'Please log into the CRM to view full details.',
  ].filter(Boolean);

  const html = textLines
    .map((line) => (line === '' ? '<br />' : `<p>${line}</p>`))
    .join('\n');

  await transporter.sendMail({
    from: `"CRM" <${GMAIL_OAUTH_USER}>`,
    to: payload.to,
    subject,
    text: textLines.join('\n'),
    html,
  });
}

export interface RmaClientEmailPayload {
  to: string;
  clientName?: string | null;
  caseNumber: string;
  siteName?: string | null;
  replacedPartNumber: string;
  shippingCarrier?: string | null;
  trackingNumberOut?: string | null;
  shippedDate?: string | null;
}

export async function sendRmaClientEmail(payload: RmaClientEmailPayload) {
  if (!emailEnabled || !transporter) {
    console.warn('Client email not sent: Gmail OAuth2 env vars not configured');
    return;
  }

  const subject = `RMA Update - Case #${payload.caseNumber}`;
  const greetingName = payload.clientName || 'Customer';

  const textLines = [
    `Dear ${greetingName},`,
    '',
    `This is an update regarding your RMA case #${payload.caseNumber}.`,
    payload.siteName ? `Site: ${payload.siteName}` : '',
    '',
    'Replacement Part Details:',
    `  Replacement Part Number: ${payload.replacedPartNumber}`,
    '',
    payload.shippingCarrier || payload.trackingNumberOut || payload.shippedDate
      ? 'Replacement Shipment Details:'
      : '',
    payload.shippingCarrier ? `  Carrier: ${payload.shippingCarrier}` : '',
    payload.trackingNumberOut ? `  Tracking Number: ${payload.trackingNumberOut}` : '',
    payload.shippedDate ? `  Shipped Date: ${payload.shippedDate}` : '',
    '',
    'Please use the above tracking information to follow your shipment.',
  ].filter(Boolean);

  const html = textLines
    .map((line) => {
      if (line === '') return '<br />';
      // Indent lines starting with two spaces as a bullet/indented line
      if (line.startsWith('  ')) {
        return `<p style="margin-left:16px;">${line.trim()}</p>`;
      }
      return `<p>${line}</p>`;
    })
    .join('\n');

  await transporter.sendMail({
    from: `"CRM" <${GMAIL_OAUTH_USER}>`,
    to: payload.to,
    subject,
    text: textLines.join('\n'),
    html,
  });
}


