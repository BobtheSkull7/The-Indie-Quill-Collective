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
      subject: 'Application Received - The Indie Quill Collective',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #1e293b; font-size: 28px; margin: 0;">
              The Indie Quill Collective
            </h1>
            <p style="color: #ef4444; font-size: 12px; margin: 5px 0 0 0;">501(c)(3) Non-Profit Organization</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">Application Received!</h2>
            <p style="margin: 0; font-size: 16px; line-height: 1.6;">
              Dear ${firstName},
            </p>
          </div>
          
          <div style="padding: 0 10px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              Thank you for submitting your application to The Indie Quill Collective! We're excited to learn about your story.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              We're excited to review your submission. Our team carefully considers each application, and you can expect to hear back from us within <strong>24 hours</strong>.
            </p>
            
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #991b1b; font-size: 14px;">
                <strong>What happens next?</strong><br>
                Our review team will evaluate your application and notify you of our decision via email.
              </p>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              If you have any questions in the meantime, please don't hesitate to reach out.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8; margin-top: 30px;">
              Warm regards,<br>
              <strong>The Indie Quill Collective Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
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
      subject: 'Congratulations! You Have Been Accepted - The Indie Quill Collective',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #1e293b; font-size: 28px; margin: 0;">
              The Indie Quill Collective
            </h1>
            <p style="color: #ef4444; font-size: 12px; margin: 5px 0 0 0;">501(c)(3) Non-Profit Organization</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">Congratulations, ${firstName}!</h2>
            <p style="margin: 0; font-size: 16px; line-height: 1.6;">
              You have been accepted into the Collective! We are thrilled to welcome you to the team and look forward to you becoming a fully published author!
            </p>
          </div>
          
          <div style="padding: 0 10px;">
            <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">The Literacy Logistics Framework:</h3>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; color: #374151;">
              <strong style="color: #0d9488;">Phase 1: AGREEMENT</strong> &#10140; Phase 2: Creation &#10140; Phase 3: Editing &#10140; Phase 4: Review &#10140; Phase 5: Modifications &#10140; Phase 6: Published &#10140; Phase 7: Marketing
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              The very first step in your publishing journey is to review and sign your publishing Agreement.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${contractUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600;">
                Sign Your Publishing Agreement
              </a>
            </div>
            
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">
                <strong>Important Logistics:</strong>
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #991b1b; font-size: 14px;">
                <li><strong>Agreement Signature:</strong> Your publishing journey cannot officially begin until this document is signed.</li>
                <li><strong>Minors & Safety:</strong> We follow COPPA to ensure that all minors are protected at all times!</li>
                <li><strong>Identity Verification:</strong> Our records indicate that you have selected to <em>${identityText}</em>. If this is incorrect, please notify jon@theindiequill.com immediately.</li>
              </ul>
            </div>
            
            <p style="color: #374151; font-size: 14px; line-height: 1.6;">
              <strong>Next Steps:</strong> Once the Agreement is signed, your profile will securely sync with the Bookstore, and your Creation tools will be unlocked.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8; margin-top: 30px;">
              Welcome to the Collective!<br><br>
              <strong>Jon</strong><br>
              Founder & Program Director, The Indie Quill Collective
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
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
      subject: 'Application Update - The Indie Quill Collective',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #1e293b; font-size: 28px; margin: 0;">
              The Indie Quill Collective
            </h1>
            <p style="color: #ef4444; font-size: 12px; margin: 5px 0 0 0;">501(c)(3) Non-Profit Organization</p>
          </div>
          
          <div style="padding: 0 10px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              Dear ${firstName},
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              Thank you for sharing your story and your application with the Collective.
            </p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #374151;">
              <strong>The Literacy Logistics Framework:</strong><br>
              Current Status: <strong style="color: #64748b;">APPLICATION REVIEW</strong>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              At this time, we are unable to move forward with your application. This decision was not easy, and we want you to know that it does not reflect on the value of your story or your potential as a writer.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              If you have questions regarding this decision or would like specific feedback on your application, please contact jon@theindiequill.com directly.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8; margin-top: 30px;">
              Best wishes on your continued writing journey.<br><br>
              <strong>The Indie Quill Collective Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
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
    console.error('Failed to send application rejected email:', error);
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
    
    const coppaReminder = isMinor ? `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Minors & Safety:</strong> As a reminder, we follow COPPA to ensure all minor authors are protected. If you see your legal name appearing anywhere in a public-facing area, please notify jon@theindiequill.com immediately.
        </p>
      </div>
    ` : '';
    
    await client.emails.send({
      from: fromEmail || 'The Indie Quill Collective <noreply@resend.dev>',
      to: toEmail,
      cc: ADMIN_CC_EMAIL,
      subject: 'Your Publishing Tools are Live! - The Indie Quill Collective',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #1e293b; font-size: 28px; margin: 0;">
              The Indie Quill Collective
            </h1>
            <p style="color: #ef4444; font-size: 12px; margin: 5px 0 0 0;">501(c)(3) Non-Profit Organization</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">Your Publishing Tools are Live!</h2>
            <p style="margin: 0; font-size: 16px; line-height: 1.6;">
              Hi ${firstName},
            </p>
          </div>
          
          <div style="padding: 0 10px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              Great news! Your signed Agreement has been processed, and your profile is now active in the Bookstore.
            </p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 15px 0; color: #166534; font-size: 14px;">
                <strong>Logistics & Access:</strong>
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 14px;">
                <li><strong>Access the Bookstore:</strong> To begin, please visit the Bookstore login page at: www.theindiequill.com</li>
                <li><strong>Login Information:</strong> You can log in using the same email address and password you created for the Collective.</li>
                <li><strong>Creation Stage (Coming Soon):</strong> We are currently finalizing the mentorship tools, formatting assistants, and cover design resources. We will notify you the moment these tools are officially unlocked.</li>
                <li><strong>Pseudonym Confirmation:</strong> Our records show your book will be published under the Pen Name: <strong>${pseudonym}</strong></li>
              </ul>
            </div>
            
            ${coppaReminder}
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8; margin-top: 30px;">
              We are excited to see your work progress through the Collective process!<br><br>
              <strong>The Indie Quill Collective Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
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
    console.error('Failed to send active author email:', error);
    return false;
  }
}

export async function sendTestEmailSamples(adminEmail: string): Promise<{ success: boolean; results: string[] }> {
  const results: string[] = [];
  
  try {
    const { client, fromEmail } = await getResendClient();
    
    // 1. Application Received sample
    await client.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: '[TEST SAMPLE] Application Received Email',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="color: #dc2626; font-weight: bold; background: #fef2f2; padding: 12px; border-radius: 8px;">
            This is a TEST SAMPLE of the email applicants receive when they submit an application.
          </p>
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: 'Playfair Display', serif; color: #0d9488; margin: 0;">The Indie Quill</h1>
            <p style="color: #64748b; margin: 5px 0;">COLLECTIVE</p>
          </div>
          <div style="background: linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin: 0 0 15px 0;">Application Received!</h2>
            <p style="color: #475569; line-height: 1.6;">Dear [Applicant Name],</p>
            <p style="color: #475569; line-height: 1.6;">
              Thank you for applying to The Indie Quill Collective! We're excited to review your application
              and learn more about your writing journey.
            </p>
            <p style="color: #475569; line-height: 1.6;">
              Our team will carefully review your submission and get back to you within 2-3 weeks.
              In the meantime, you can log in to your dashboard to track your application status.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} The Indie Quill Collective</p>
          </div>
        </div>
      `
    });
    results.push('Application Received - SENT');
    
    // 2. Application Accepted sample
    await client.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: '[TEST SAMPLE] Application Accepted Email',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="color: #dc2626; font-weight: bold; background: #fef2f2; padding: 12px; border-radius: 8px;">
            This is a TEST SAMPLE of the email applicants receive when their application is ACCEPTED.
          </p>
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: 'Playfair Display', serif; color: #0d9488; margin: 0;">The Indie Quill</h1>
            <p style="color: #64748b; margin: 5px 0;">COLLECTIVE</p>
          </div>
          <div style="background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #166534; margin: 0 0 15px 0;">Congratulations! You've Been Accepted!</h2>
            <p style="color: #475569; line-height: 1.6;">Dear [Applicant Name],</p>
            <p style="color: #475569; line-height: 1.6;">
              We are thrilled to inform you that your application to The Indie Quill Collective has been <strong>approved</strong>!
            </p>
            <p style="color: #475569; line-height: 1.6;">
              Your next step is to review and sign your publishing agreement. Log in to your dashboard to access your contract.
            </p>
            <p style="color: #475569; line-height: 1.6; font-style: italic;">
              Identity Mode: [Pseudonym Only / Public Identity]
            </p>
          </div>
          <div style="text-align: center; padding: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} The Indie Quill Collective</p>
          </div>
        </div>
      `
    });
    results.push('Application Accepted - SENT');
    
    // 3. Application Rejected sample
    await client.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: '[TEST SAMPLE] Application Rejected Email',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="color: #dc2626; font-weight: bold; background: #fef2f2; padding: 12px; border-radius: 8px;">
            This is a TEST SAMPLE of the email applicants receive when their application is REJECTED.
          </p>
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: 'Playfair Display', serif; color: #0d9488; margin: 0;">The Indie Quill</h1>
            <p style="color: #64748b; margin: 5px 0;">COLLECTIVE</p>
          </div>
          <div style="background: linear-gradient(135deg, #fef2f2 0%, #fef3c7 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #991b1b; margin: 0 0 15px 0;">Application Update</h2>
            <p style="color: #475569; line-height: 1.6;">Dear [Applicant Name],</p>
            <p style="color: #475569; line-height: 1.6;">
              Thank you for your interest in The Indie Quill Collective. After careful consideration,
              we regret to inform you that we are unable to accept your application at this time.
            </p>
            <p style="color: #475569; line-height: 1.6;">
              We encourage you to continue developing your craft, and you are welcome to reapply in the future.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} The Indie Quill Collective</p>
          </div>
        </div>
      `
    });
    results.push('Application Rejected - SENT');
    
    // 4. Active Author Welcome sample
    await client.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: '[TEST SAMPLE] Active Author Welcome Email',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p style="color: #dc2626; font-weight: bold; background: #fef2f2; padding: 12px; border-radius: 8px;">
            This is a TEST SAMPLE of the email authors receive when they become ACTIVE AUTHORS (contract signed & synced to LLC).
          </p>
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-family: 'Playfair Display', serif; color: #0d9488; margin: 0;">The Indie Quill</h1>
            <p style="color: #64748b; margin: 5px 0;">COLLECTIVE</p>
          </div>
          <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #0d9488; margin: 0 0 15px 0;">Welcome to the Family, [Pseudonym]!</h2>
            <p style="color: #475569; line-height: 1.6;">Dear [First Name],</p>
            <p style="color: #475569; line-height: 1.6;">
              Your contract has been signed and you are now officially an <strong>Active Author</strong> 
              with The Indie Quill Collective!
            </p>
            <p style="color: #475569; line-height: 1.6;">
              Your author profile has been created with The Indie Quill LLC, and you're ready to begin 
              your publishing journey.
            </p>
            <div style="background: white; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="color: #0d9488; font-weight: bold; margin: 0 0 10px 0;">Next Steps:</p>
              <ul style="color: #475569; margin: 0; padding-left: 20px;">
                <li>Access your Author Dashboard</li>
                <li>Submit your manuscript</li>
                <li>Connect with your cohort</li>
              </ul>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} The Indie Quill Collective</p>
          </div>
        </div>
      `
    });
    results.push('Active Author Welcome - SENT');
    
    return { success: true, results };
  } catch (error) {
    console.error('Failed to send test emails:', error);
    results.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, results };
  }
}
