import { sendWelcomeEmail } from '../src/lib/email/resend';

async function test() {
  console.log('🧪 Testing sendWelcomeEmail with sandbox domain...');
  
  // Override FROM_EMAIL for this test
  process.env.RESEND_FROM_EMAIL = 'Busy Bees <onboarding@resend.dev>';
  
  const result = await sendWelcomeEmail({
    to: 'danieljlawless@gmail.com',
    name: 'Daniel',
    phone: '(555) 123-4567',
  });

  if (result.success) {
    console.log('✅ Welcome email sent!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📬 Check your inbox for the welcome email!');
  } else {
    console.log('❌ Failed:', result.error);
  }
}

test();
