import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('players')
      .select('id, email, name')
      .eq('email', email)
      .single()

    if (userError || !user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with that email exists, a reset link has been sent.' 
      })
    }

    // Generate reset token (you might want to use a more secure method)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const resetExpires = new Date(Date.now() + 3600000) // 1 hour from now

    // Store reset token in database
    const { error: updateError } = await supabase
      .from('players')
      .update({
        reset_token: resetToken,
        reset_token_expires: resetExpires.toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error storing reset token:', updateError)
      return NextResponse.json({ error: 'Failed to process reset request' }, { status: 500 })
    }

    // TODO: Send email with reset link
    // For now, we'll just log the reset link (in production, send via email service)
    const resetLink = `${request.nextUrl.origin}/reset-password?token=${resetToken}`
    console.log(`Password reset link for ${email}: ${resetLink}`)

    // In production, you would send an email here using a service like:
    // - SendGrid
    // - AWS SES
    // - Resend
    // - Nodemailer

    return NextResponse.json({ 
      success: true, 
      message: 'If an account with that email exists, a reset link has been sent.' 
    })
  } catch (error) {
    console.error('Error in forgot password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

