import { NextRequest, NextResponse } from 'next/server'
import { sendNewsletterSignupEmail } from '@/lib/email/resend'
import { logger } from '@/lib/logger'

interface NewsletterSignupData {
  name: string
  email: string
}

export async function POST(request: NextRequest) {
  try {
    const data: NewsletterSignupData = await request.json()

    // Validate required fields
    if (!data.name || !data.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
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

    // Send notification email to business
    const result = await sendNewsletterSignupEmail({
      name: data.name,
      email: data.email,
    })

    if (!result.success) {
      logger.error(
        { error: result.error, email: data.email },
        'Failed to send newsletter signup notification'
      )
      // Still return success to user - we don't want to block signups
      // The form submission is logged and can be recovered
    }

    logger.info(
      { email: data.email, name: data.name },
      '📧 Newsletter signup submitted'
    )

    return NextResponse.json({
      success: true,
      message: 'Thank you for joining our newsletter! Welcome to the Busy Bees family.'
    })

  } catch (error) {
    logger.error({ error }, 'Newsletter signup error')
    return NextResponse.json(
      { error: 'Failed to process newsletter signup' },
      { status: 500 }
    )
  }
}
