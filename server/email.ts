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

export async function sendApplicationReceivedEmail(toEmail: string, firstName: string, bookTitle: string) {
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
              Thank you for submitting your application for <strong>"${bookTitle}"</strong> to The Indie Quill Collective!
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

export async function sendApplicationAcceptedEmail(toEmail: string, firstName: string, bookTitle: string) {
  try {
    const { client, fromEmail } = await getResendClient();
    
    await client.emails.send({
      from: fromEmail || 'The Indie Quill Collective <noreply@resend.dev>',
      to: toEmail,
      subject: 'Congratulations! Your Application Has Been Accepted - The Indie Quill Collective',
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
              Your application has been accepted!
            </p>
          </div>
          
          <div style="padding: 0 10px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              We're thrilled to welcome you and <strong>"${bookTitle}"</strong> to The Indie Quill Collective!
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              Your next step is to sign your publishing agreement. Please log in to your account to review and sign your contract.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600;">
                View Your Contract
              </a>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8; margin-top: 30px;">
              Welcome to the collective!<br>
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
    
    console.log(`Application accepted email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send application accepted email:', error);
    return false;
  }
}

export async function sendApplicationRejectedEmail(toEmail: string, firstName: string, bookTitle: string) {
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
              Thank you for your interest in The Indie Quill Collective and for submitting <strong>"${bookTitle}"</strong>.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              After careful consideration, we regret to inform you that we are unable to accept your application at this time. This decision was not easy, and we want you to know that it does not reflect on the quality of your work.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8;">
              We encourage you to continue pursuing your writing dreams, and you are welcome to apply again in the future.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.8; margin-top: 30px;">
              Best wishes,<br>
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
