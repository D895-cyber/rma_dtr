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
  console.log(`[Email] Attempting to send assignment email to ${payload.to} for ${payload.caseType} case ${payload.caseNumber}`);
  
  if (!emailEnabled || !transporter) {
    console.warn('[Email] Email not sent: Gmail OAuth2 env vars not configured');
    console.warn('[Email] Check if GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, GMAIL_OAUTH_REFRESH_TOKEN, and GMAIL_OAUTH_USER are set');
    return;
  }

  if (!payload.to || !payload.to.includes('@')) {
    console.error(`[Email] Invalid email address: ${payload.to}`);
    throw new Error(`Invalid email address: ${payload.to}`);
  }

  try {
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

    const info = await transporter.sendMail({
      from: `"CRM" <${GMAIL_OAUTH_USER}>`,
      to: payload.to,
      subject,
      text: textLines.join('\n'),
      html,
    });

    console.log(`[Email] Assignment email sent successfully to ${payload.to}. Message ID: ${info.messageId}`);
    return info;
  } catch (error: any) {
    console.error(`[Email] Failed to send assignment email to ${payload.to}:`, error);
    console.error(`[Email] Error details:`, {
      message: error.message,
      code: error.code,
      response: error.response,
    });
    throw error;
  }
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

// ============================================
// SMART NOTIFICATIONS
// ============================================

export interface StatusChangeEmailPayload {
  to: string;
  userName?: string | null;
  caseType: 'DTR' | 'RMA';
  caseNumber: string;
  oldStatus: string;
  newStatus: string;
  link?: string;
}

export async function sendStatusChangeEmail(payload: StatusChangeEmailPayload) {
  if (!emailEnabled || !transporter) {
    console.warn('[Email] Status change email not sent: Gmail OAuth2 env vars not configured');
    return;
  }

  if (!payload.to || !payload.to.includes('@')) {
    console.error(`[Email] Invalid email address: ${payload.to}`);
    return;
  }

  try {
    const subject = `[${payload.caseType}] Status Changed - #${payload.caseNumber}`;
    const greetingName = payload.userName || 'User';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const textLines = [
      `Hi ${greetingName},`,
      '',
      `The status of ${payload.caseType} case #${payload.caseNumber} has been updated.`,
      `Previous Status: ${payload.oldStatus}`,
      `New Status: ${payload.newStatus}`,
      '',
      payload.link ? `View Case: ${payload.link}` : `View Case: ${frontendUrl}/#${payload.caseType.toLowerCase()}`,
    ].filter(Boolean);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Case Status Changed</h2>
        <p>Hi ${greetingName},</p>
        <p>The status of <strong>${payload.caseType}</strong> case <strong>#${payload.caseNumber}</strong> has been updated.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; background-color: #f5f5f5;"><strong>Previous Status:</strong></td>
            <td style="padding: 8px;">${payload.oldStatus}</td>
          </tr>
          <tr>
            <td style="padding: 8px; background-color: #f5f5f5;"><strong>New Status:</strong></td>
            <td style="padding: 8px;"><strong>${payload.newStatus}</strong></td>
          </tr>
        </table>
        <p><a href="${payload.link || `${frontendUrl}/#${payload.caseType.toLowerCase()}`}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Case</a></p>
      </div>
    `;

    await transporter.sendMail({
      from: `"CRM" <${GMAIL_OAUTH_USER}>`,
      to: payload.to,
      subject,
      text: textLines.join('\n'),
      html,
    });

    console.log(`[Email] Status change email sent to ${payload.to}`);
  } catch (error: any) {
    console.error(`[Email] Failed to send status change email:`, error);
  }
}

export interface OverdueCaseEmailPayload {
  to: string;
  userName?: string | null;
  caseType: 'DTR' | 'RMA';
  caseNumber: string;
  daysOverdue: number;
  link?: string;
}

export async function sendOverdueCaseEmail(payload: OverdueCaseEmailPayload) {
  if (!emailEnabled || !transporter) {
    console.warn('[Email] Overdue case email not sent: Gmail OAuth2 env vars not configured');
    return;
  }

  if (!payload.to || !payload.to.includes('@')) {
    console.error(`[Email] Invalid email address: ${payload.to}`);
    return;
  }

  try {
    const subject = `[${payload.caseType}] Overdue Case Alert - #${payload.caseNumber}`;
    const greetingName = payload.userName || 'User';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const textLines = [
      `Hi ${greetingName},`,
      '',
      `⚠️ ALERT: ${payload.caseType} case #${payload.caseNumber} is ${payload.daysOverdue} day(s) overdue.`,
      '',
      'Please take immediate action to resolve this case.',
      '',
      payload.link ? `View Case: ${payload.link}` : `View Case: ${frontendUrl}/#${payload.caseType.toLowerCase()}`,
    ].filter(Boolean);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">⚠️ Overdue Case Alert</h2>
        <p>Hi ${greetingName},</p>
        <p style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <strong>${payload.caseType}</strong> case <strong>#${payload.caseNumber}</strong> is <strong>${payload.daysOverdue} day(s) overdue</strong>.
        </p>
        <p>Please take immediate action to resolve this case.</p>
        <p><a href="${payload.link || `${frontendUrl}/#${payload.caseType.toLowerCase()}`}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Case</a></p>
      </div>
    `;

    await transporter.sendMail({
      from: `"CRM" <${GMAIL_OAUTH_USER}>`,
      to: payload.to,
      subject,
      text: textLines.join('\n'),
      html,
    });

    console.log(`[Email] Overdue case email sent to ${payload.to}`);
  } catch (error: any) {
    console.error(`[Email] Failed to send overdue case email:`, error);
  }
}

export interface EscalationEmailPayload {
  to: string;
  userName?: string | null;
  caseType: 'DTR' | 'RMA';
  caseNumber: string;
  escalatedFrom: string;
  escalatedTo: string;
  reason?: string;
  link?: string;
}

export async function sendEscalationEmail(payload: EscalationEmailPayload) {
  if (!emailEnabled || !transporter) {
    console.warn('[Email] Escalation email not sent: Gmail OAuth2 env vars not configured');
    return;
  }

  if (!payload.to || !payload.to.includes('@')) {
    console.error(`[Email] Invalid email address: ${payload.to}`);
    return;
  }

  try {
    const subject = `[${payload.caseType}] Case Escalated - #${payload.caseNumber}`;
    const greetingName = payload.userName || 'User';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const textLines = [
      `Hi ${greetingName},`,
      '',
      `${payload.caseType} case #${payload.caseNumber} has been escalated.`,
      `Escalated from: ${payload.escalatedFrom}`,
      `Escalated to: ${payload.escalatedTo}`,
      payload.reason ? `Reason: ${payload.reason}` : '',
      '',
      payload.link ? `View Case: ${payload.link}` : `View Case: ${frontendUrl}/#${payload.caseType.toLowerCase()}`,
    ].filter(Boolean);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff9800;">Case Escalated</h2>
        <p>Hi ${greetingName},</p>
        <p><strong>${payload.caseType}</strong> case <strong>#${payload.caseNumber}</strong> has been escalated.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; background-color: #f5f5f5;"><strong>Escalated from:</strong></td>
            <td style="padding: 8px;">${payload.escalatedFrom}</td>
          </tr>
          <tr>
            <td style="padding: 8px; background-color: #f5f5f5;"><strong>Escalated to:</strong></td>
            <td style="padding: 8px;"><strong>${payload.escalatedTo}</strong></td>
          </tr>
          ${payload.reason ? `<tr><td style="padding: 8px; background-color: #f5f5f5;"><strong>Reason:</strong></td><td style="padding: 8px;">${payload.reason}</td></tr>` : ''}
        </table>
        <p><a href="${payload.link || `${frontendUrl}/#${payload.caseType.toLowerCase()}`}" style="background-color: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Case</a></p>
      </div>
    `;

    await transporter.sendMail({
      from: `"CRM" <${GMAIL_OAUTH_USER}>`,
      to: payload.to,
      subject,
      text: textLines.join('\n'),
      html,
    });

    console.log(`[Email] Escalation email sent to ${payload.to}`);
  } catch (error: any) {
    console.error(`[Email] Failed to send escalation email:`, error);
  }
}


