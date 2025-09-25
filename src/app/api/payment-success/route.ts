import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  
  // Here you could verify the payment with Stripe if needed
  // For now, just redirect to home with success parameter
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.redirect(`${baseUrl}/?payment=success&session_id=${sessionId}`)
}
