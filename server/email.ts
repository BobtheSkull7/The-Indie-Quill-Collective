import { Resend } from 'resend';

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

export async function sendApplicationReceivedEmail(toEmail: string, firstName: string) {
  try {
    const { client, fromEmail } = await getResendClient();
    
    await client.emails.send({
      from: fromEmail || 'The Indie Quill Collective <noreply@resend.dev>',
      to: toEmail,
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
    
    console.log(`Application received email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send application received email:', error);
    return false;
  }
}

export async function sendApplicationAcceptedEmail(toEmail: string, firstName: string, identityMode?: string) {
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
    
    console.log(`Application accepted email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send application accepted email:', error);
    return false;
  }
}

export async function sendApplicationRejectedEmail(toEmail: string, firstName: string) {
  try {
    const { client, fromEmail } = await getResendClient();
    
    await client.emails.send({
      from: fromEmail || 'The Indie Quill Collective <noreply@resend.dev>',
      to: toEmail,
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
    
    console.log(`Application rejected email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send application rejected email:', error);
    return false;
  }
}

export async function sendActiveAuthorEmail(toEmail: string, firstName: string, pseudonym: string, isMinor: boolean) {
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
    
    console.log(`Active author email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send active author email:', error);
    return false;
  }
}
