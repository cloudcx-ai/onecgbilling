import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT || 25),
  secure: process.env.SMTP_PORT === '465',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
  tls: {
    rejectUnauthorized: false,
  },
});

export async function sendAlert(to: string, subject: string, html: string): Promise<void> {
  if (!to) return;
  
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'monitor@cloudcx.local',
      to,
      subject,
      html,
    });
    console.log(`Alert sent to ${to}: ${subject}`);
  } catch (e: any) {
    console.error('Alert send failed:', e.message);
  }
}
