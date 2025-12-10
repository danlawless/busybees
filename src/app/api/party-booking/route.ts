import { NextRequest, NextResponse } from 'next/server'
import { sendPartyBookingEmail } from '@/lib/email/resend'
import { logger } from '@/lib/logger'

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

    // Send email to business
    const result = await sendPartyBookingEmail({
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      childName: data.childName,
      childAge: data.childAge,
      selectedDate: data.selectedDate,
      selectedTimeSlot: data.selectedTimeSlot,
      partyPackage: data.partyPackage,
      guestCount: data.guestCount,
      additionalInfo: data.additionalInfo,
      dietaryRestrictions: data.dietaryRestrictions,
    })

    if (!result.success) {
      logger.error(
        { error: result.error, email: data.email, childName: data.childName },
        'Failed to send party booking email'
      )
      return NextResponse.json(
        { error: 'Failed to submit booking request. Please try again or call us at (978) 785-0015' },
        { status: 500 }
      )
    }

    logger.info(
      { email: data.email, childName: data.childName, partyPackage: data.partyPackage },
      '🎉 Party booking request submitted'
    )

    return NextResponse.json({
      success: true,
      message: `Thank you for booking ${data.childName}'s party! We'll contact you shortly to confirm details and arrange payment.`
    })

  } catch (error) {
    logger.error({ error }, 'Party booking error')
    return NextResponse.json(
      { error: 'Failed to process party booking' },
      { status: 500 }
    )
  }
}
