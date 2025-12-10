import { NextRequest, NextResponse } from 'next/server'
import { sendContactFormEmail } from '@/lib/email/resend'
import { logger } from '@/lib/logger'

interface ContactFormData {
  name: string
  email: string
  phone?: string
  userType: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const data: ContactFormData = await request.json()

    // Validate required fields
    if (!data.name || !data.email || !data.message || !data.userType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Send email to business
    const result = await sendContactFormEmail({
      name: data.name,
      email: data.email,
      phone: data.phone,
      userType: data.userType,
      message: data.message,
    })

    if (!result.success) {
      logger.error(
        { error: result.error, email: data.email },
        'Failed to send contact form email'
      )
      return NextResponse.json(
        { error: 'Failed to send message. Please try again or email us directly at info@busybeesipc.com' },
        { status: 500 }
      )
    }

    logger.info(
      { email: data.email, userType: data.userType },
      '📧 Contact form submitted successfully'
    )

    return NextResponse.json({
      success: true,
      message: 'Thank you for contacting us! We\'ll get back to you soon.'
    })

  } catch (error) {
    logger.error({ error }, 'Contact form error')
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    )
  }
}
