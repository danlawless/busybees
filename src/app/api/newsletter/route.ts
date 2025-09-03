import { NextRequest, NextResponse } from 'next/server'

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

    // Create email content
    const emailSubject = 'New Newsletter Signup - Busy Bees'
    const emailBody = `
New newsletter signup from Busy Bees website:

Name: ${data.name}
Email: ${data.email}

---
Please add this contact to the Busy Bees newsletter list.
Signed up at: ${new Date().toLocaleString()}
`

    console.log('📧 New newsletter signup:')
    console.log('To: info@busybeesipc.com')
    console.log('Subject:', emailSubject)
    console.log('Body:', emailBody)
    
    // TODO: Replace with actual email sending service (SendGrid, Nodemailer, etc.)
    // You might also want to integrate with newsletter services like Mailchimp, ConvertKit, etc.
    // await sendEmail({
    //   to: 'info@busybeesipc.com',
    //   subject: emailSubject,
    //   body: emailBody,
    //   replyTo: data.email
    // })
    
    // await addToNewsletterList({
    //   name: data.name,
    //   email: data.email
    // })

    return NextResponse.json({
      success: true,
      message: 'Thank you for joining our newsletter! Welcome to the Busy Bees family.'
    })

  } catch (error) {
    console.error('Newsletter signup error:', error)
    return NextResponse.json(
      { error: 'Failed to process newsletter signup' },
      { status: 500 }
    )
  }
}
