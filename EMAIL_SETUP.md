# Email Setup Guide

## Overview
Email confirmation functionality has been implemented using Resend. When users sign up for games or seasons, they will automatically receive a beautiful HTML confirmation email.

## Setup Steps

### 1. Install Resend Package
```bash
npm install resend
```

### 2. Get Resend API Key
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Go to API Keys section
4. Create a new API key
5. Copy the API key

### 3. Add Environment Variables
Add these to your `.env.local` file:

```env
# Resend Email Configuration
RESEND_API_KEY=your_resend_api_key_here

# App Configuration (if not already set)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Verify Domain (Production)
For production, you'll need to verify your domain with Resend:
1. Go to Domains section in Resend dashboard
2. Add your domain (e.g., `yourdomain.com`)
3. Add the required DNS records
4. Update the `from` field in `/src/app/api/send-confirmation-email/route.ts`:
   ```typescript
   from: 'Soccer App <noreply@yourdomain.com>'
   ```

## How It Works

### Email Triggers
Emails are automatically sent when:
1. **Game Purchase**: User completes payment for a game
2. **Season Purchase**: User completes payment for a season
3. **Season Attendance**: User confirms which games they'll attend in a season

### Email Content
Each email includes:
- Beautiful HTML design with your branding
- Event details (name, date, time, location)
- Group information
- Price paid
- Spots available
- Link to user profile
- Responsive design for mobile

### Email Templates
The email template is built with:
- Clean, modern design
- Your brand colors (#4FA481 green, #E0F7EE light green)
- Responsive layout
- Professional typography
- Clear call-to-action buttons

## Testing

### Local Testing
1. Make sure your `.env.local` has the Resend API key
2. Sign up for a game or season
3. Check your email for the confirmation
4. Check the browser console for any email errors

### Production Testing
1. Deploy with environment variables set
2. Test with real email addresses
3. Verify domain is properly configured
4. Check Resend dashboard for delivery stats

## Troubleshooting

### Common Issues
1. **"Failed to send email"**: Check Resend API key is correct
2. **"Domain not verified"**: Verify your domain in Resend dashboard
3. **Emails not received**: Check spam folder, verify email address

### Debugging
- Check browser console for email API errors
- Check server logs for detailed error messages
- Use Resend dashboard to see delivery status

## Customization

### Email Design
Edit `/src/app/api/send-confirmation-email/route.ts` to customize:
- Colors and branding
- Layout and styling
- Content and messaging
- Images and logos

### Email Content
The email data structure includes:
```typescript
{
  to: string,
  playerName: string,
  type: 'game' | 'season',
  eventName: string,
  groupName: string,
  date: string,
  time: string,
  location: string,
  price: number,
  spotsAvailable?: number,
  totalSpots?: number
}
```

## Free Tier Limits
Resend free tier includes:
- 3,000 emails per month
- 100 emails per day
- No domain verification required for testing

This should be sufficient for most small to medium applications.
