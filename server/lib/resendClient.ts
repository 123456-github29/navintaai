import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@navinta.org';

export async function getUncachableResendClient() {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not configured');
  }
  return {
    client: new Resend(RESEND_API_KEY),
    fromEmail: FROM_EMAIL
  };
}
