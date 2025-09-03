import { NextRequest, NextResponse } from 'next/server'

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

    // Create email content
    const emailSubject = `New Contact Form Submission - ${data.userType}`
    const emailBody = `
New contact form submission from Busy Bees website:

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || 'Not provided'}
Inquiry Type: ${data.userType}

Message:
${data.message}

---
Sent from Busy Bees Indoor Play Center website
Submitted at: ${new Date().toLocaleString()}
`

    // For now, we'll use mailto: approach or you can integrate with a service like SendGrid/Nodemailer
    // This is a basic implementation that formats the data
    
    console.log('📧 New contact form submission:')
    console.log('To: info@busybeesipc.com')
    console.log('Subject:', emailSubject)
    console.log('Body:', emailBody)
    
    // TODO: Replace with actual email sending service (SendGrid, Nodemailer, etc.)
    // await sendEmail({
    //   to: 'info@busybeesipc.com',
    //   subject: emailSubject,
    //   body: emailBody,
    //   replyTo: data.email
    // })

    return NextResponse.json({
      success: true,
      message: 'Thank you for contacting us! We\'ll get back to you soon.'
    })

  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    )
  }
}
