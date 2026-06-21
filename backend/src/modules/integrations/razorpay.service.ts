import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly useMock: boolean;

  constructor(private configService: ConfigService) {
    this.keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    this.keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    this.useMock = this.configService.get<string>('MOCK_INTEGRATIONS') === 'true';
  }

  async createPaymentLink(
    invoiceNumber: string,
    amount: number,
    customer: { name: string; email?: string; contact: string },
    dueDate: Date,
  ): Promise<{ id: string; short_url: string }> {
    const amountInPaise = Math.round(amount * 100);

    if (this.useMock || !this.keyId || this.keyId.includes('placeholder')) {
      this.logger.log(`[MOCK RAZORPAY] Generating mock payment link for Invoice ${invoiceNumber}`);
      const mockId = `plink_${Math.random().toString(36).substring(2, 15)}`;
      return {
        id: mockId,
        short_url: `https://rzp.io/i/mock_${mockId}`,
      };
    }

    try {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const response = await axios.post(
        'https://api.razorpay.com/v1/payment_links',
        {
          amount: amountInPaise,
          currency: 'INR',
          accept_partial: false,
          reference_id: invoiceNumber,
          description: `Payment for SAJ Surveying Invoice #${invoiceNumber}`,
          customer: {
            name: customer.name,
            email: customer.email || 'billing@sajsurveys.com',
            contact: customer.contact,
          },
          notify: {
            sms: false,
            email: false,
          },
          reminder_enable: false,
          notes: {
            invoiceNumber: invoiceNumber,
          },
          expire_by: Math.floor(new Date(dueDate).getTime() / 1000),
        },
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        id: response.data.id,
        short_url: response.data.short_url,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Razorpay payment link: ${error.response?.data?.error?.description || error.message}`,
      );
      throw new Error(`Razorpay Integration Error: ${error.message}`);
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (this.useMock) {
      return true; // Auto pass in mock mode
    }
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');
      return expectedSignature === signature;
    } catch (error) {
      this.logger.error(`Error verifying webhook signature: ${error.message}`);
      return false;
    }
  }
}
