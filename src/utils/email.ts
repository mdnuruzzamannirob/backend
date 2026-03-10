import nodemailer from "nodemailer";
import { config } from "../config";
import logger from "./logger";

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_PORT === 465,
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await transporter.sendMail({
      from: config.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    logger.info(`Email sent to ${options.to}`);
  } catch (error) {
    logger.error("Failed to send email", { error, to: options.to });
  }
};

// Email templates
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: "Welcome to the Library!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome, ${name}!</h2>
        <p>Thank you for registering at our Library Management System.</p>
        <p>You can now browse books, borrow titles, and manage your reading list.</p>
        <p>Best regards,<br/>Library Management Team</p>
      </div>
    `,
  }),

  passwordReset: (name: string, resetLink: string) => ({
    subject: "Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Hi ${name},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${resetLink}" style="background: #007bff; color: #fff; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Reset Password</a></p>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br/>Library Management Team</p>
      </div>
    `,
  }),

  overdueReminder: (name: string, bookTitle: string, dueDate: string) => ({
    subject: "Overdue Book Reminder",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Overdue Book Notice</h2>
        <p>Hi ${name},</p>
        <p>The following book is overdue:</p>
        <p><strong>${bookTitle}</strong></p>
        <p>Due Date: <strong>${dueDate}</strong></p>
        <p>Please return it as soon as possible to avoid additional fines.</p>
        <p>Best regards,<br/>Library Management Team</p>
      </div>
    `,
  }),

  fineNotification: (name: string, amount: number, reason: string) => ({
    subject: "Fine Notification",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Fine Notice</h2>
        <p>Hi ${name},</p>
        <p>A fine has been applied to your account:</p>
        <p>Amount: <strong>$${amount.toFixed(2)}</strong></p>
        <p>Reason: ${reason}</p>
        <p>Please settle your fine at the library or make an online payment.</p>
        <p>Best regards,<br/>Library Management Team</p>
      </div>
    `,
  }),

  membershipExpiry: (name: string, expiryDate: string) => ({
    subject: "Membership Expiring Soon",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Membership Expiry Notice</h2>
        <p>Hi ${name},</p>
        <p>Your library membership will expire on <strong>${expiryDate}</strong>.</p>
        <p>Please renew your membership to continue enjoying our services.</p>
        <p>Best regards,<br/>Library Management Team</p>
      </div>
    `,
  }),

  paymentConfirmation: (name: string, amount: number, fineId: string) => ({
    subject: "Payment Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Confirmed</h2>
        <p>Hi ${name},</p>
        <p>Your payment of <strong>$${amount.toFixed(2)}</strong> for fine #${fineId} has been confirmed.</p>
        <p>Thank you for settling your dues.</p>
        <p>Best regards,<br/>Library Management Team</p>
      </div>
    `,
  }),

  reservationReady: (name: string, bookTitle: string) => ({
    subject: "Reserved Book Available",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Reserved Book is Available!</h2>
        <p>Hi ${name},</p>
        <p>Great news! The book you reserved is now available:</p>
        <p><strong>${bookTitle}</strong></p>
        <p>Please pick it up within 48 hours, or the reservation will be cancelled.</p>
        <p>Best regards,<br/>Library Management Team</p>
      </div>
    `,
  }),
};
