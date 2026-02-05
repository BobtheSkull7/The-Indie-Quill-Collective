import { Resend } from 'resend';
import { db } from './db';
import { emailLogs } from '../shared/schema';

const ADMIN_CC_EMAIL = 'jon@theindiequill.com';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

async function logEmail(
  emailType: 'application_received' | 'application_accepted' | 'application_rejected' | 'active_author',
  recipientEmail: string,
  recipientName: string | null,
  status: 'sent' | 'failed',
  userId?: number,
  applicationId?: number,
  errorMessage?: string
) {
  try {
    await db.insert(emailLogs).values({
      emailType,
      recipientEmail,
      recipientName,
      userId: userId || null,
      applicationId: applicationId || null,
      status,
      errorMessage: errorMessage || null,
    });
  } catch (error) {
    console.error('Failed to log email:', error);
  }
}

async function sendFailureNotification(
  emailType: string,
  recipientEmail: string,
  recipientName: string | null,
  errorMessage: string
) {
  try {
    const { client, fromEmail } = await getResendClient();
    
    await client.emails.send({
      from: fromEmail || 'The Indie Quill Collective <noreply@resend.dev>',
      to: ADMIN_CC_EMAIL,
      subject: `[EMAIL FAILURE ALERT] ${emailType} Email Failed`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 12px; padding: 30px;">
            <h1 style="color: #dc2626; margin: 0 0 20px 0; font-size: 24px;">
              ⚠️ Email Delivery Failed
            </h1>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; color: #991b1b; font-weight: bold;">Email Type:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; color: #374151;">${emailType}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; color: #991b1b; font-weight: bold;">Recipient:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; color: #374151;">${recipientName || 'Unknown'} (${recipientEmail})</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; color: #991b1b; font-weight: bold;">Time:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; color: #374151;">${new Date().toISOString()}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #991b1b; font-weight: bold;">Error:</td>
                <td style="padding: 10px 0; color: #374151;">${errorMessage}</td>
              </tr>
            </table>
            
            <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px;">
              <p style="margin: 0; color: #374151; font-size: 14px;">
                <strong>Action Required:</strong> Please manually contact the recipient or retry the email from the Admin Dashboard.
              </p>
            </div>
          </div>
          
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            This is an automated alert from The Indie Quill Collective email system.
          </p>
        </div>
      `
    });
    console.log(`Failure notification sent for ${emailType} to ${recipientEmail}`);
  } catch (notifyError) {
    console.error('Failed to send failure notification:', notifyError);
  }
}

export async function sendApplicationReceivedEmail(
  toEmail: string, 
  firstName: string,
  userId?: number,
  applicationId?: number
) {
  try {
    const { client, fromEmail } = await getResendClient();
    
    await client.emails.send({
      from: fromEmail || 'The Indie Quill Collective <noreply@resend.dev>',
      to: toEmail,
      cc: ADMIN_CC_EMAIL,
      subject: '[COLLECTIVE-LOG] Your Writing Journey Begins',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0F172A; padding: 30px; text-align: center;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: white; font-size: 28px; margin: 0;">
              The Indie Quill Collective
            </h1>
            <p style="color: #EF4444; font-size: 12px; margin: 8px 0 0 0; letter-spacing: 1px;">501(c)(3) NON-PROFIT ORGANIZATION</p>
          </div>
          
          <div style="background: #f8fafc; padding: 40px 30px;">
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Dear ${firstName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                We have received your application to The Indie Quill Collective. Our team is currently reviewing your submission to ensure your creative voice is protected within our 501(c)(3) framework.
              </p>
              
              <hr style="border: none; border-top: 3px solid #EF4444; margin: 30px 0;">
              
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0;">
                You can check your status at any time by visiting:<br>
                <strong style="color: #0F172A;">www.theindiequillcollective.org</strong>
              </p>
            </div>
          </div>
          
          <div style="background: #0F172A; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} The Indie Quill Collective. All rights reserved.
            </p>
          </div>
        </div>
      `
    });
    
    await logEmail('application_received', toEmail, firstName, 'sent', userId, applicationId);
    console.log(`Application received email sent to ${toEmail} (CC: ${ADMIN_CC_EMAIL})`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logEmail('application_received', toEmail, firstName, 'failed', userId, applicationId, errorMessage);
    await sendFailureNotification('Application Received', toEmail, firstName, errorMessage);
    console.error('Failed to send application received email:', error);
    return false;
  }
}

export async function sendApplicationAcceptedEmail(
  toEmail: string, 
  firstName: string, 
  identityMode?: string,
  userId?: number,
  applicationId?: number
) {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'https://indie-quill-collective.replit.app';
    const contractUrl = `${baseUrl}/contracts`;
    
    const identityText = identityMode === 'public' 
      ? 'Allow Legal Name' 
      : 'Use a Pseudonym';
    
    await client.emails.send({
      from: fromEmail || 'The Indie Quill Collective <noreply@resend.dev>',
      to: toEmail,
      cc: ADMIN_CC_EMAIL,
      subject: '[COLLECTIVE-LOG] Congratulations - Agreement Ready',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0F172A; padding: 30px; text-align: center;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: white; font-size: 28px; margin: 0;">
              The Indie Quill Collective
            </h1>
            <p style="color: #EF4444; font-size: 12px; margin: 8px 0 0 0; letter-spacing: 1px;">501(c)(3) NON-PROFIT ORGANIZATION</p>
          </div>
          
          <div style="background: #f8fafc; padding: 40px 30px;">
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Dear ${firstName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                We are thrilled to invite you into the Collective. Your publishing agreement is now available for review and signature in your private dashboard.
              </p>
              
              <hr style="border: none; border-top: 3px solid #EF4444; margin: 30px 0;">
              
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Please visit <strong style="color: #0F172A;">www.theindiequillcollective.org</strong> to sign with your Legal Name. Remember, your identity remains protected behind our PII Firewall.
              </p>
              
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
                <strong>Identity Mode:</strong> ${identityText}
              </p>
            </div>
          </div>
          
          <div style="background: #0F172A; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} The Indie Quill Collective. All rights reserved.
            </p>
          </div>
        </div>
      `
    });
    
    await logEmail('application_accepted', toEmail, firstName, 'sent', userId, applicationId);
    console.log(`Application accepted email sent to ${toEmail} (CC: ${ADMIN_CC_EMAIL})`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logEmail('application_accepted', toEmail, firstName, 'failed', userId, applicationId, errorMessage);
    await sendFailureNotification('Application Accepted', toEmail, firstName, errorMessage);
    console.error('Failed to send application accepted email:', error);
    return false;
  }
}

export async function sendApplicationRejectedEmail(
  toEmail: string, 
  firstName: string,
  userId?: number,
  applicationId?: number
) {
  try {
    const { client, fromEmail } = await getResendClient();
    
    await client.emails.send({
      from: fromEmail || 'The Indie Quill Collective <noreply@resend.dev>',
      to: toEmail,
      cc: ADMIN_CC_EMAIL,
      subject: '[COLLECTIVE-LOG] Application Update',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0F172A; padding: 30px; text-align: center;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: white; font-size: 28px; margin: 0;">
              The Indie Quill Collective
            </h1>
            <p style="color: #EF4444; font-size: 12px; margin: 8px 0 0 0; letter-spacing: 1px;">501(c)(3) NON-PROFIT ORGANIZATION</p>
          </div>
          
          <div style="background: #f8fafc; padding: 40px 30px;">
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Dear ${firstName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Thank you for sharing your story with us. At this time, we are unable to move forward with your application. We encourage you to keep writing and developing your craft.
              </p>
              
              <hr style="border: none; border-top: 3px solid #EF4444; margin: 30px 0;">
              
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0;">
                <strong style="color: #0F172A;">www.theindiequillcollective.org</strong>
              </p>
            </div>
          </div>
          
          <div style="background: #0F172A; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} The Indie Quill Collective. All rights reserved.
            </p>
          </div>
        </div>
      `
    });
    
    await logEmail('application_rejected', toEmail, firstName, 'sent', userId, applicationId);
    console.log(`Application rejected email sent to ${toEmail} (CC: ${ADMIN_CC_EMAIL})`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logEmail('application_rejected', toEmail, firstName, 'failed', userId, applicationId, errorMessage);
    await sendFailureNotification('Application Rejected', toEmail, firstName, errorMessage);
    console.error('Failed to send application rejected email:', error);
    return false;
  }
}

export async function sendWelcomeToCollectiveEmail(
  toEmail: string, 
  firstName: string,
  vibeScribeId: string,
  userId?: string
) {
  try {
    const { client, fromEmail } = await getCredentials().then(() => getResendClient());
    
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'https://indie-quill-collective.replit.app';
    const dashboardUrl = `${baseUrl}/student`;
    
    await client.emails.send({
      from: fromEmail || 'The Indie Quill Collective <noreply@resend.dev>',
      to: toEmail,
      cc: ADMIN_CC_EMAIL,
      subject: '[COLLECTIVE-LOG] Welcome to the Collective!',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0F172A; padding: 30px; text-align: center;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: white; font-size: 28px; margin: 0;">
              The Indie Quill Collective
            </h1>
            <p style="color: #EF4444; font-size: 12px; margin: 8px 0 0 0; letter-spacing: 1px;">501(c)(3) NON-PROFIT ORGANIZATION</p>
          </div>
          
          <div style="background: #f8fafc; padding: 40px 30px;">
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Dear ${firstName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Congratulations! You have been approved and are now an official member of The Indie Quill Collective. Your author journey begins now!
              </p>
              
              <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #166534; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;">Your VibeScribe ID:</p>
                <p style="color: #166534; font-size: 24px; font-family: monospace; margin: 0; text-align: center;">${vibeScribeId}</p>
              </div>
              
              <hr style="border: none; border-top: 3px solid #EF4444; margin: 30px 0;">
              
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Visit your Student Dashboard to begin your curriculum and track your progress:
              </p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6, #0ea5e9); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Go to Student Dashboard
                </a>
              </div>
              
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
                Use the VibeScribe mobile app to record your voice and submit your work. Your character awaits!
              </p>
            </div>
          </div>
          
          <div style="background: #0F172A; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} The Indie Quill Collective. All rights reserved.
            </p>
          </div>
        </div>
      `
    });
    
    console.log(`Welcome to Collective email sent to ${toEmail} (CC: ${ADMIN_CC_EMAIL})`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await sendFailureNotification('Welcome to Collective', toEmail, firstName, errorMessage);
    console.error('Failed to send welcome to collective email:', error);
    return false;
  }
}

export async function sendActiveAuthorEmail(
  toEmail: string, 
  firstName: string, 
  pseudonym: string, 
  isMinor: boolean,
  userId?: number,
  applicationId?: number
) {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const coppaNote = isMinor ? `
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                <strong>Minors & Safety:</strong> We follow COPPA to ensure all minor authors are protected at all times.
              </p>
    ` : '';
    
    await client.emails.send({
      from: fromEmail || 'The Indie Quill Collective <noreply@resend.dev>',
      to: toEmail,
      cc: ADMIN_CC_EMAIL,
      subject: `[COLLECTIVE-LOG] Welcome to the Family, ${pseudonym}!`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0F172A; padding: 30px; text-align: center;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: white; font-size: 28px; margin: 0;">
              The Indie Quill Collective
            </h1>
            <p style="color: #EF4444; font-size: 12px; margin: 8px 0 0 0; letter-spacing: 1px;">501(c)(3) NON-PROFIT ORGANIZATION</p>
          </div>
          
          <div style="background: #f8fafc; padding: 40px 30px;">
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Dear ${firstName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Your account is now active. You have been successfully synced to The Indie Quill Publishing. You may now log in using your existing Collective email and password to begin Phase 2 (Creation) of the Publishing Journey.
              </p>
              
              <hr style="border: none; border-top: 3px solid #EF4444; margin: 30px 0;">
              
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0;">
                The Indie Quill Publishing:<br>
                <strong style="color: #0F172A;">www.indiequill.com</strong>
              </p>
              ${coppaNote}
            </div>
          </div>
          
          <div style="background: #0F172A; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} The Indie Quill Collective. All rights reserved.
            </p>
          </div>
        </div>
      `
    });
    
    await logEmail('active_author', toEmail, firstName, 'sent', userId, applicationId);
    console.log(`Active author email sent to ${toEmail} (CC: ${ADMIN_CC_EMAIL})`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logEmail('active_author', toEmail, firstName, 'failed', userId, applicationId, errorMessage);
    await sendFailureNotification('Active Author', toEmail, firstName, errorMessage);
    console.error('Failed to send active author email:', error);
    return false;
  }
}

export async function sendTestEmailSamples(adminEmail: string): Promise<{ success: boolean; results: string[] }> {
  const results: string[] = [];
  
  try {
    const { client, fromEmail } = await getResendClient();
    
    // 1. Application Received sample
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    const result1 = await client.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: '[TEST] [COLLECTIVE-LOG] Your Writing Journey Begins',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
          <p style="color: #dc2626; font-weight: bold; background: #fef2f2; padding: 12px; margin: 0;">
            TEST SAMPLE: Email sent when an applicant submits their application.
          </p>
          <div style="background: #0F172A; padding: 30px; text-align: center;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: white; font-size: 28px; margin: 0;">The Indie Quill Collective</h1>
            <p style="color: #EF4444; font-size: 12px; margin: 8px 0 0 0; letter-spacing: 1px;">501(c)(3) NON-PROFIT ORGANIZATION</p>
          </div>
          <div style="background: #f8fafc; padding: 40px 30px;">
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">Dear [Applicant Name],</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                We have received your application to The Indie Quill Collective. Our team is currently reviewing your submission to ensure your creative voice is protected within our 501(c)(3) framework.
              </p>
              <hr style="border: none; border-top: 3px solid #EF4444; margin: 30px 0;">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0;">
                You can check your status at any time by visiting:<br>
                <strong style="color: #0F172A;">www.theindiequillcollective.org</strong>
              </p>
            </div>
          </div>
          <div style="background: #0F172A; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} The Indie Quill Collective</p>
          </div>
        </div>
      `
    });
    console.log('Test email 1 result:', result1);
    results.push('Application Received - SENT');
    
    await delay(2000);
    
    // 2. Application Accepted sample
    const result2 = await client.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: '[TEST] [COLLECTIVE-LOG] Congratulations - Agreement Ready',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
          <p style="color: #dc2626; font-weight: bold; background: #fef2f2; padding: 12px; margin: 0;">
            TEST SAMPLE: Email sent when an application is ACCEPTED.
          </p>
          <div style="background: #0F172A; padding: 30px; text-align: center;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: white; font-size: 28px; margin: 0;">The Indie Quill Collective</h1>
            <p style="color: #EF4444; font-size: 12px; margin: 8px 0 0 0; letter-spacing: 1px;">501(c)(3) NON-PROFIT ORGANIZATION</p>
          </div>
          <div style="background: #f8fafc; padding: 40px 30px;">
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">Dear [Applicant Name],</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                We are thrilled to invite you into the Collective. Your publishing agreement is now available for review and signature in your private dashboard.
              </p>
              <hr style="border: none; border-top: 3px solid #EF4444; margin: 30px 0;">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Please visit <strong style="color: #0F172A;">www.theindiequillcollective.org</strong> to sign with your Legal Name. Remember, your identity remains protected behind our PII Firewall.
              </p>
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
                <strong>Identity Mode:</strong> [Pseudonym Only / Public Identity]
              </p>
            </div>
          </div>
          <div style="background: #0F172A; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} The Indie Quill Collective</p>
          </div>
        </div>
      `
    });
    console.log('Test email 2 result:', result2);
    results.push('Application Accepted - SENT');
    
    await delay(2000);
    
    // 3. Application Rejected sample
    const result3 = await client.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: '[TEST] [COLLECTIVE-LOG] Application Update',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
          <p style="color: #dc2626; font-weight: bold; background: #fef2f2; padding: 12px; margin: 0;">
            TEST SAMPLE: Email sent when an application is REJECTED.
          </p>
          <div style="background: #0F172A; padding: 30px; text-align: center;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: white; font-size: 28px; margin: 0;">The Indie Quill Collective</h1>
            <p style="color: #EF4444; font-size: 12px; margin: 8px 0 0 0; letter-spacing: 1px;">501(c)(3) NON-PROFIT ORGANIZATION</p>
          </div>
          <div style="background: #f8fafc; padding: 40px 30px;">
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">Dear [Applicant Name],</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Thank you for sharing your story with us. At this time, we are unable to move forward with your application. We encourage you to keep writing and developing your craft.
              </p>
              <hr style="border: none; border-top: 3px solid #EF4444; margin: 30px 0;">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0;">
                <strong style="color: #0F172A;">www.theindiequillcollective.org</strong>
              </p>
            </div>
          </div>
          <div style="background: #0F172A; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} The Indie Quill Collective</p>
          </div>
        </div>
      `
    });
    console.log('Test email 3 result:', result3);
    results.push('Application Rejected - SENT');
    
    await delay(2000);
    
    // 4. Active Author Welcome sample
    const result4 = await client.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: '[TEST] [COLLECTIVE-LOG] Welcome to the Family, [Pseudonym]!',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
          <p style="color: #dc2626; font-weight: bold; background: #fef2f2; padding: 12px; margin: 0;">
            TEST SAMPLE: Email sent when an author becomes ACTIVE (contract signed & synced).
          </p>
          <div style="background: #0F172A; padding: 30px; text-align: center;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: white; font-size: 28px; margin: 0;">The Indie Quill Collective</h1>
            <p style="color: #EF4444; font-size: 12px; margin: 8px 0 0 0; letter-spacing: 1px;">501(c)(3) NON-PROFIT ORGANIZATION</p>
          </div>
          <div style="background: #f8fafc; padding: 40px 30px;">
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">Dear [First Name],</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Your account is now active. You have been successfully synced to The Indie Quill Publishing. You may now log in using your existing Collective email and password to begin Phase 2 (Creation) of the Publishing Journey.
              </p>
              <hr style="border: none; border-top: 3px solid #EF4444; margin: 30px 0;">
              <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0;">
                The Indie Quill Publishing:<br>
                <strong style="color: #0F172A;">www.indiequill.com</strong>
              </p>
            </div>
          </div>
          <div style="background: #0F172A; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} The Indie Quill Collective</p>
          </div>
        </div>
      `
    });
    console.log('Test email 4 result:', result4);
    results.push('Active Author Welcome - SENT');
    
    return { success: true, results };
  } catch (error) {
    console.error('Failed to send test emails:', error);
    results.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, results };
  }
}
