export function generateNotificationService(): string {
  return `import nodemailer from 'nodemailer';

export class NotificationService {
  constructor() {
    // Initialize email transporter
    // In production, use environment variables for credentials
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      }
    });
  }
  
  async sendSubmissionConfirmation(submission) {
    const emailField = Object.keys(submission.data).find(key => 
      key.includes('email') || submission.data[key]?.includes('@')
    );
    
    const recipientEmail = submission.data[emailField];
    
    if (!recipientEmail) {
      console.log('No email address found for submission confirmation');
      return;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"WorkflowHub" <noreply@workflowhub.com>',
      to: recipientEmail,
      subject: 'Workflow Submission Received',
      html: \`
        <h2>Thank you for your submission!</h2>
        <p>We have received your workflow submission.</p>
        <p><strong>Submission ID:</strong> \${submission.id}</p>
        <p><strong>Status:</strong> Submitted</p>
        <p><strong>Submitted at:</strong> \${new Date(submission.createdAt).toLocaleString()}</p>
        <hr>
        <h3>Submitted Information:</h3>
        <pre>\${JSON.stringify(submission.data, null, 2)}</pre>
        <hr>
        <p>You can check the status of your submission at any time using your submission ID.</p>
        <p>Thank you!</p>
      \`
    };
    
    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log('Submission confirmation email sent to:', recipientEmail);
    } catch (error) {
      console.error('Failed to send submission confirmation:', error);
    }
  }
  
  async sendApprovalNotification(submission, decision, comments) {
    const emailField = Object.keys(submission).find(key => 
      key.includes('email') || (submission[key] && String(submission[key]).includes('@'))
    );
    
    const recipientEmail = submission[emailField];
    
    if (!recipientEmail) {
      console.log('No email address found for approval notification');
      return;
    }
    
    const status = decision === 'approved' ? '✅ Approved' : '❌ Rejected';
    const color = decision === 'approved' ? '#28a745' : '#dc3545';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"WorkflowHub" <noreply@workflowhub.com>',
      to: recipientEmail,
      subject: \`Workflow Submission \${decision.charAt(0).toUpperCase() + decision.slice(1)}\`,
      html: \`
        <h2 style="color: \${color}">Your submission has been \${status}</h2>
        <p><strong>Submission ID:</strong> \${submission.id}</p>
        <p><strong>Decision:</strong> \${decision}</p>
        <p><strong>Decision Date:</strong> \${new Date().toLocaleString()}</p>
        \${comments ? \`
        <hr>
        <h3>Comments from Approver:</h3>
        <p>\${comments}</p>
        \` : ''}
        <hr>
        <p>If you have any questions, please contact your administrator.</p>
      \`
    };
    
    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log('Approval notification email sent to:', recipientEmail);
      
      // Also notify approvers if configured
      if (process.env.NOTIFY_APPROVERS === 'true' && process.env.APPROVER_EMAILS) {
        const approverEmails = process.env.APPROVER_EMAILS.split(',');
        await this.notifyApprovers(submission, decision, comments, approverEmails);
      }
    } catch (error) {
      console.error('Failed to send approval notification:', error);
    }
  }
  
  async notifyApprovers(submission, decision, comments, approverEmails) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"WorkflowHub" <noreply@workflowhub.com>',
      to: approverEmails.join(', '),
      subject: \`Workflow Approval Completed - \${decision}\`,
      html: \`
        <h2>Workflow Approval Completed</h2>
        <p>A workflow submission has been processed.</p>
        <p><strong>Submission ID:</strong> \${submission.id}</p>
        <p><strong>Decision:</strong> \${decision}</p>
        <p><strong>Processed at:</strong> \${new Date().toLocaleString()}</p>
        \${comments ? \`<p><strong>Comments:</strong> \${comments}</p>\` : ''}
        <hr>
        <h3>Original Submission Data:</h3>
        <pre>\${JSON.stringify(submission, null, 2)}</pre>
      \`
    };
    
    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log('Approver notification sent to:', approverEmails.join(', '));
    } catch (error) {
      console.error('Failed to notify approvers:', error);
    }
  }
  
  async sendErrorNotification(error, context) {
    if (!process.env.ERROR_NOTIFICATION_EMAIL) {
      return;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"WorkflowHub" <noreply@workflowhub.com>',
      to: process.env.ERROR_NOTIFICATION_EMAIL,
      subject: '⚠️ Workflow Error Alert',
      html: \`
        <h2 style="color: #dc3545">Workflow Error Detected</h2>
        <p><strong>Error:</strong> \${error.message}</p>
        <p><strong>Time:</strong> \${new Date().toLocaleString()}</p>
        <p><strong>Context:</strong> \${context}</p>
        <hr>
        <h3>Stack Trace:</h3>
        <pre>\${error.stack}</pre>
      \`
    };
    
    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log('Error notification sent');
    } catch (emailError) {
      console.error('Failed to send error notification:', emailError);
    }
  }
  
  // SMS notification placeholder
  async sendSMSNotification(phoneNumber, message) {
    // In production, integrate with Twilio, SNS, or other SMS provider
    console.log(\`SMS to \${phoneNumber}: \${message}\`);
    
    // Example Twilio integration:
    /*
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilio = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      await twilio.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
    }
    */
  }
  
  // Webhook notification placeholder
  async sendWebhookNotification(url, data) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Workflow-Event': 'submission'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(\`Webhook failed: \${response.status}\`);
      }
      
      console.log('Webhook notification sent to:', url);
    } catch (error) {
      console.error('Failed to send webhook:', error);
    }
  }
}`;
}