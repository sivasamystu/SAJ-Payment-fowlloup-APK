import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly templateName: string;
  private readonly useMock: boolean;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TWO_FACTOR_API_KEY');
    this.senderId = this.configService.get<string>('TWO_FACTOR_SENDER_ID') || 'SAJOTP';
    this.templateName = this.configService.get<string>('TWO_FACTOR_TEMPLATE_NAME') || 'LOGINSMS';
    this.useMock = this.configService.get<string>('MOCK_INTEGRATIONS') === 'true';
  }

  // Normalizes phone number format for 2Factor.in (expects country code, e.g. 919843258877)
  private formatPhoneNumber(phone: string): string {
    const cleanDigits = phone.replace(/[+\s-]/g, '');
    
    // If it's a 10-digit number, prepend 91 (India country code)
    if (cleanDigits.length === 10) {
      return `91${cleanDigits}`;
    }
    return cleanDigits;
  }

  async sendOtp(
    mobileNumber: string,
    otp: string,
  ): Promise<{ success: boolean; responseData: any }> {
    const formattedNumber = this.formatPhoneNumber(mobileNumber);

    if (this.useMock || !this.apiKey || this.apiKey.includes('placeholder')) {
      this.logger.log(
        `[MOCK 2FACTOR SMS] Sending OTP '${otp}' to ${formattedNumber} using Sender ID '${this.senderId}' and Template '${this.templateName}'`,
      );
      return {
        success: true,
        responseData: { status: 'Success', Details: 'Mock Sent successfully' },
      };
    }

    try {
      const url = `https://2factor.in/API/V1/${this.apiKey}/ADDON_SERVICES/SEND/TSMS`;
      const response = await axios.get(url, {
        params: {
          From: this.senderId,
          To: formattedNumber,
          TemplateName: this.templateName,
          VAR1: otp,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const isSuccess = response.data?.Status === 'Success';
      if (isSuccess) {
        this.logger.log(`OTP successfully sent to ${formattedNumber} via 2Factor`);
      } else {
        this.logger.warn(`2Factor response status is not success: ${JSON.stringify(response.data)}`);
      }

      return {
        success: isSuccess,
        responseData: response.data,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to send 2Factor SMS: ${error.response?.data?.Details || error.message}`,
      );
      return {
        success: false,
        responseData: error.response?.data || { error: error.message },
      };
    }
  }
}
