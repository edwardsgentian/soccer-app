import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Check if API key is available
const apiKey = process.env.RESEND_API_KEY || 're_LC1E7AdN_MDgidGK3NbaUFVvz1B9tfGhU' // Fallback for testing
console.log('🔑 API Key check:', {
  exists: !!apiKey,
  length: apiKey?.length || 0,
  startsWith: apiKey?.substring(0, 10) + '...' || 'undefined',
  fromEnv: !!process.env.RESEND_API_KEY
})

const resend = apiKey ? new Resend(apiKey) : null

interface EmailData {
  to: string
  playerName: string
  type: 'game' | 'season'
  eventName: string
  groupName: string
  date: string
  time: string
  location: string
  price: number
  spotsAvailable?: number
  totalSpots?: number
}

export async function POST(request: NextRequest) {
  try {
    const emailData: EmailData = await request.json()
    
    const { to, playerName, type, eventName, groupName, date, time, location, price, spotsAvailable, totalSpots } = emailData

    // Create email subject
    const subject = `Confirmation: You're signed up for ${eventName}!`

    // Create HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .container {
              background-color: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              width: 60px;
              height: 60px;
              background-color: #4FA481;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 24px;
              font-weight: bold;
            }
            h1 {
              color: #2d3748;
              font-size: 28px;
              margin: 0;
              font-weight: 600;
            }
            .subtitle {
              color: #718096;
              font-size: 16px;
              margin: 10px 0 0 0;
            }
            .event-details {
              background-color: #f7fafc;
              border-radius: 8px;
              padding: 24px;
              margin: 30px 0;
            }
            .event-title {
              font-size: 22px;
              font-weight: 600;
              color: #2d3748;
              margin: 0 0 8px 0;
            }
            .group-name {
              color: #4FA481;
              font-size: 16px;
              margin: 0 0 20px 0;
            }
            .detail-row {
              display: flex;
              align-items: center;
              margin: 12px 0;
              font-size: 16px;
            }
            .detail-icon {
              width: 20px;
              height: 20px;
              margin-right: 12px;
              color: #718096;
            }
            .detail-label {
              font-weight: 500;
              color: #4a5568;
              min-width: 80px;
            }
            .detail-value {
              color: #2d3748;
            }
            .price-section {
              background-color: #E0F7EE;
              border: 2px solid #4FA481;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
              text-align: center;
            }
            .price-label {
              font-size: 14px;
              color: #4FA481;
              margin: 0 0 8px 0;
              font-weight: 500;
            }
            .price-amount {
              font-size: 32px;
              font-weight: 700;
              color: #2d3748;
              margin: 0;
            }
            .spots-info {
              background-color: #fff5f5;
              border: 1px solid #fed7d7;
              border-radius: 6px;
              padding: 12px;
              margin: 20px 0;
              text-align: center;
            }
            .spots-text {
              color: #c53030;
              font-size: 14px;
              margin: 0;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 30px;
              border-top: 1px solid #e2e8f0;
              color: #718096;
              font-size: 14px;
            }
            .cta-button {
              display: inline-block;
              background-color: #4FA481;
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              margin: 20px 0;
            }
            @media (max-width: 600px) {
              body {
                padding: 10px;
              }
              .container {
                padding: 20px;
              }
              h1 {
                font-size: 24px;
              }
              .event-title {
                font-size: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚽</div>
              <h1>You're In!</h1>
              <p class="subtitle">Your ${type === 'game' ? 'game' : 'season'} registration is confirmed</p>
            </div>

            <div class="event-details">
              <h2 class="event-title">${eventName}</h2>
              <p class="group-name">${groupName}</p>
              
              <div class="detail-row">
                <span class="detail-label">📅 Date:</span>
                <span class="detail-value">${date}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">🕐 Time:</span>
                <span class="detail-value">${time}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">📍 Location:</span>
                <span class="detail-value">${location}</span>
              </div>
              
              ${spotsAvailable !== undefined && totalSpots !== undefined ? `
                <div class="detail-row">
                  <span class="detail-label">👥 Spots:</span>
                  <span class="detail-value">${spotsAvailable} of ${totalSpots} available</span>
                </div>
              ` : ''}
            </div>

            <div class="price-section">
              <p class="price-label">Total Paid</p>
              <p class="price-amount">$${price}</p>
            </div>

            ${spotsAvailable !== undefined && spotsAvailable <= 3 ? `
              <div class="spots-info">
                <p class="spots-text">⚡ Only ${spotsAvailable} spots left!</p>
              </div>
            ` : ''}

            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile" class="cta-button">
                View Your Profile
              </a>
            </div>

            <div class="footer">
              <p>Thanks for joining ${groupName}! We're excited to see you on the field.</p>
              <p>If you have any questions, feel free to reach out to the group organizer.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Log email details
    console.log('📧 EMAIL CONFIRMATION:')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('Player:', playerName)
    console.log('Event:', eventName)
    console.log('Group:', groupName)
    console.log('Date:', date)
    console.log('Time:', time)
    console.log('Location:', location)
    console.log('Price: $' + price)
    console.log('Type:', type)
    console.log('---')
    
    // Send email using Resend
    console.log('🔑 API Key present:', !!process.env.RESEND_API_KEY)
    console.log('🔑 API Key starts with:', process.env.RESEND_API_KEY?.substring(0, 10) + '...')
    
    if (!resend) {
      console.error('❌ Resend not initialized - API key missing')
      return NextResponse.json({ 
        success: false, 
        error: 'Email service not configured - API key missing'
      }, { status: 500 })
    }
    
    try {
      console.log('📤 Attempting to send email via Resend...')
      
      // For testing: send to verified email address, but include original recipient in subject
      const testEmail = 'edwardsgentian@gmail.com' // Your verified Resend email
      const testSubject = `${subject} (Original: ${to})`
      
      const { data, error } = await resend.emails.send({
        from: 'Soccer App <onboarding@resend.dev>', // Using Resend's default domain for testing
        to: [testEmail],
        subject: testSubject,
        html: htmlContent,
      })

      console.log('📤 Resend response:', { data, error })

      if (error) {
        console.error('❌ Resend error:', error)
        return NextResponse.json({ error: 'Failed to send email', details: error }, { status: 500 })
      }

      console.log('✅ Email sent successfully:', data)
      return NextResponse.json({ success: true, messageId: data?.id })
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send email',
        details: emailError instanceof Error ? emailError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
