import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Get the backend URL
    const backendHost = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost';
    const backendPort = process.env.NEXT_PUBLIC_HTTP_PORT || '3001';
    const backendUrl = `${backendHost}:${backendPort}`;
    console.log('Forwarding request to backend:', backendUrl)
    // Forward the request to the backend
    const response = await fetch(`${backendUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error forwarding to backend:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
