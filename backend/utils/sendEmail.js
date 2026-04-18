import nodemailer from "nodemailer";

// ── Transporter ────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── sendEmail ──────────────────────────────────────────────
// Reusable email sender for any feature that needs it.
//
// Usage:
//   await sendEmail({
//     to:      "recipient@example.com",
//     subject: "Emergency Alert",
//     html:    "<p>...</p>",
//   });

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials not set — email not sent.");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from:    process.env.SMTP_FROM || `CoLive <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text:    text || html.replace(/<[^>]*>/g, ""),
    });
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("sendEmail error:", err.message);
    throw err;
  }
};

// ── Email templates ────────────────────────────────────────
export const emergencyAlertEmail = ({ tenantName, ownerName, propertyTitle, roomLabel, customNote }) => ({
  subject: `🚨 Emergency Alert — ${propertyTitle}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
      <div style="background: #fff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">

        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #fef2f2; border: 2px solid #ef4444; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 28px; text-align: center;">
            🚨
          </div>
          <h1 style="color: #b91c1c; font-size: 22px; margin: 16px 0 4px;">Emergency Alert</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Sent via CoLive Housing Platform</p>
        </div>

        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
          This is an emergency alert regarding <strong>${tenantName}</strong>,
          a tenant at <strong>${propertyTitle}</strong>, ${roomLabel}.
        </p>

        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
          <p style="color: #b91c1c; font-weight: bold; margin: 0 0 8px;">Alert Message:</p>
          <p style="color: #374151; margin: 0; line-height: 1.6;">
            ${customNote
              ? customNote
              : `The property owner <strong>${ownerName}</strong> has triggered an emergency alert for this tenant. Please contact ${tenantName} immediately to ensure their safety and wellbeing.`
            }
          </p>
        </div>

        <div style="background: #f3f4f6; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px; font-weight: bold;">DETAILS</p>
          <p style="color: #374151; font-size: 14px; margin: 4px 0;">👤 Tenant: <strong>${tenantName}</strong></p>
          <p style="color: #374151; font-size: 14px; margin: 4px 0;">🏠 Property: <strong>${propertyTitle}</strong></p>
          <p style="color: #374151; font-size: 14px; margin: 4px 0;">🚪 Room: <strong>${roomLabel}</strong></p>
          <p style="color: #374151; font-size: 14px; margin: 4px 0;">👤 Reported by: <strong>${ownerName}</strong></p>
        </div>

        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
          Please contact ${tenantName} as soon as possible.
          If you cannot reach them, consider contacting local emergency services.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This alert was sent automatically by CoLive Housing Platform.
          Do not reply to this email.
        </p>
      </div>
    </div>
  `,
});
