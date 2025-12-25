import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface FormSubmissionData {
  address: string
  propertyState: string
  name: string
  phone: string
  submittedAt: Date
}

export async function sendFormSubmissionEmail(data: FormSubmissionData): Promise<void> {
  // Check if Resend API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Email notification skipped.')
    return
  }

  // Check if notification email is configured
  const notificationEmail = process.env.NOTIFICATION_EMAIL
  if (!notificationEmail) {
    console.warn('NOTIFICATION_EMAIL is not set. Email notification skipped.')
    return
  }

  // Format property state for display
  const propertyStateDisplay = data.propertyState
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  // Format date/time
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(data.submittedAt)

  try {
    await resend.emails.send({
      from: 'Doorly Properties <onboarding@resend.dev>', // You'll need to verify your domain with Resend
      to: notificationEmail,
      subject: `New Property Submission - ${data.address.substring(0, 50)}${data.address.length > 50 ? '...' : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Property Submission</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h1 style="color: #ea4b4b; margin-top: 0; font-size: 24px; border-bottom: 2px solid #ea4b4b; padding-bottom: 10px;">
                New Property Submission
              </h1>
              
              <div style="margin-top: 30px;">
                <h2 style="color: #102a43; font-size: 18px; margin-bottom: 15px;">Property Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #486581; width: 140px;">Address:</td>
                    <td style="padding: 10px 0; color: #102a43;">${escapeHtml(data.address)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #486581;">Property State:</td>
                    <td style="padding: 10px 0; color: #102a43;">${escapeHtml(propertyStateDisplay)}</td>
                  </tr>
                </table>
              </div>

              <div style="margin-top: 30px;">
                <h2 style="color: #102a43; font-size: 18px; margin-bottom: 15px;">Contact Information</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #486581; width: 140px;">Name:</td>
                    <td style="padding: 10px 0; color: #102a43;">${escapeHtml(data.name)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #486581;">Phone:</td>
                    <td style="padding: 10px 0; color: #102a43;">
                      <a href="tel:${escapeHtml(data.phone)}" style="color: #ea4b4b; text-decoration: none;">${escapeHtml(data.phone)}</a>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="color: #627d98; font-size: 14px; margin: 0;">
                  Submitted on: <strong>${formattedDate}</strong>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #627d98; font-size: 12px;">
              <p>This is an automated notification from Doorly Properties</p>
            </div>
          </body>
        </html>
      `,
    })

    console.log('Email notification sent successfully')
  } catch (error: any) {
    // Log error but don't throw - we don't want email failures to break form submission
    console.error('Failed to send email notification:', error.message || error)
    throw error // Re-throw so caller can decide how to handle
  }
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}


