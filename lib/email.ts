import { Resend } from 'resend';

export const resend = new Resend(
  process.env.RESEND_API_KEY
);

export const EXPIRATION_FROM_EMAIL =
  process.env.EXPIRATION_FROM_EMAIL ||
  'onboarding@resend.dev';
