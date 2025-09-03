import { NextRequest, NextResponse } from 'next/server'

interface PartyBookingData {
  contactName: string
  email: string
  phone: string
  childName: string
  childAge: number
  selectedDate: string
  selectedTimeSlot: string
  partyPackage: string
  guestCount: number
  additionalInfo?: string
  dietaryRestrictions?: string
}

export async function POST(request: NextRequest) {
  try {
    const data: PartyBookingData = await request.json()
    
    // Validate required fields
    if (!data.contactName || !data.email || !data.phone || !data.childName || 
        !data.selectedDate || !data.selectedTimeSlot || !data.partyPackage) {
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
    const emailSubject = `New Party Booking Request - ${data.childName}'s Birthday`
    const emailBody = `
New party booking request from Busy Bees website:

PARTY DETAILS:
Child's Name: ${data.childName}
Child's Age: ${data.childAge}
Party Date: ${data.selectedDate}
Time Slot: ${data.selectedTimeSlot}
Package: ${data.partyPackage}
Number of Guests: ${data.guestCount}

CONTACT INFORMATION:
Contact Name: ${data.contactName}
Email: ${data.email}
Phone: ${data.phone}

ADDITIONAL INFORMATION:
${data.additionalInfo || 'None provided'}

DIETARY RESTRICTIONS:
${data.dietaryRestrictions || 'None provided'}

---
Please follow up with party booking confirmation and payment details.
Submitted at: ${new Date().toLocaleString()}
`

    console.log('🎉 New party booking request:')
    console.log('To: info@busybeesipc.com')
    console.log('Subject:', emailSubject)
    console.log('Body:', emailBody)
    
    // TODO: Replace with actual email sending service
    // await sendEmail({
    //   to: 'info@busybeesipc.com',
    //   subject: emailSubject,
    //   body: emailBody,
    //   replyTo: data.email
    // })

    return NextResponse.json({
      success: true,
      message: `Thank you for booking ${data.childName}'s party! We'll contact you shortly to confirm details and arrange payment.`
    })

  } catch (error) {
    console.error('Party booking error:', error)
    return NextResponse.json(
      { error: 'Failed to process party booking' },
      { status: 500 }
    )
  }
}
