import 'dotenv/config';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { logger } from '../lib/logger';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private emailMethod: 'smtp' | 'resend' | 'console' = 'console';

  constructor() {
    this.initializeEmailService();
  }

  private initializeEmailService() {
    // Check for Resend API key first (preferred method)
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.emailMethod = 'resend';
      return;
    }

    // Fallback to SMTP if Resend not available
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.emailMethod = 'smtp';
      return;
    }

    // No email configuration found
  }

  async sendInterviewNotification(
    to: string,
    candidateName: string,
    interviewDate: Date,
    interviewerName: string
  ): Promise<boolean> {
    try {
      const subject = `New Interview Assigned - ${candidateName}`;
      const html = `
        <h2>New Interview Assignment</h2>
        <p>You have been assigned a new interview:</p>
        <ul>
          <li><strong>Candidate:</strong> ${candidateName}</li>
          <li><strong>Date & Time:</strong> ${interviewDate.toLocaleString()}</li>
          <li><strong>Duration:</strong> 30 minutes</li>
        </ul>
        <p>Please log into the ATS platform to view more details and prepare for the interview.</p>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      logger.error('Failed to send interview notification:', error);
      return false;
    }
  }

  async sendWelcomeEmail(
    to: string,
    fullName: string,
    temporaryPassword: string
  ): Promise<boolean> {
    try {
      // If no email service configured, just log the credentials
      if (this.emailMethod === 'console') {
        return true;
      }

      const subject = 'Welcome to RecruitPro ATS Platform';
      const html = `
        <h2>Welcome to RecruitPro</h2>
        <p>Hello ${fullName},</p>
        <p>Your account has been created for the RecruitPro ATS platform. Here are your login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${to}</li>
          <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
        </ul>
        <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
        <p>You can access the platform at: ${process.env.APP_URL || 'http://localhost:5000'}</p>
      `;

      return await this.sendEmail(to, subject, html, fullName);
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      return false;
    }
  }

  private async sendEmail(to: string, subject: string, html: string, fullName?: string): Promise<boolean> {
    try {
      if (this.emailMethod === 'resend' && this.resend) {
        // Check if it's a test domain (example.com, test.com, etc.)
        const testDomains = ['example.com', 'test.com', 'localhost'];
        const isTestDomain = testDomains.some(domain => to.includes(domain));

        if (isTestDomain) {
          logger.info(`📧 Test email skipped for ${to} (test domain)`);
          return true;
        }

        const { data, error } = await this.resend.emails.send({
          from: 'RecruitPro <onboarding@resend.dev>',
          to: [to],
          subject: subject,
          html: html,
        });

        if (error) {
          logger.error('Resend API error:', error);

          // If it's a testing limitation, log credentials instead
          const anyErr = error as any;
          if (anyErr.statusCode === 403 && anyErr.message?.includes('testing emails')) {
            logger.info(`📧 Test email skipped for ${to} (Resend testing limitation)`);
            return true;
          }

          return false;
        }

        return true;
      }

      if (this.emailMethod === 'smtp' && this.transporter) {
        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to,
          subject,
          html,
        };

        await this.transporter.sendMail(mailOptions);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();