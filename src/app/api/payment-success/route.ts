import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  
  // Here you could verify the payment with Stripe if needed
  // For now, just redirect to home with success parameter
  
  // Use the request URL to determine the correct domain
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`
  
  return NextResponse.redirect(`${baseUrl}/?payment=success&session_id=${sessionId}`)
}
