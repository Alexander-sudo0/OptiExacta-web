import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 })
    }

    // Create transporter - using SMTP relay or direct
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    })

    // Send email to info@visionera.live
    await transporter.sendMail({
      from: `"VisionEra Contact Form" <${process.env.SMTP_USER || 'noreply@visionera.live'}>`,
      to: 'info@visionera.live',
      replyTo: email,
      subject: `[VisionEra Contact] ${name} from ${company || 'N/A'}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${email}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Company:</td><td style="padding: 8px;">${company || 'N/A'}</td></tr>
        </table>
        <h3>Message:</h3>
        <p style="white-space: pre-wrap;">${message}</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
