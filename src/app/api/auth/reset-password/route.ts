import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    // Find user with valid reset token
    const { data: user, error: userError } = await supabase
      .from('players')
      .select('id, reset_token_expires')
      .eq('reset_token', token)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(user.reset_token_expires)
    
    if (now > expiresAt) {
      return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 })
    }

    // Hash the new password (you might want to use bcrypt or similar)
    const hashedPassword = btoa(password) // Simple encoding for now

    // Update password and clear reset token
    const { error: updateError } = await supabase
      .from('players')
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_expires: null
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully' 
    })
  } catch (error) {
    console.error('Error in reset password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
