import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WatiTemplateParam {
  name: string;
  value: string;
}

@Injectable()
export class WatiService {
  private readonly logger = new Logger(WatiService.name);
  private readonly apiEndpoint: string;
  private readonly apiToken: string;
  private readonly useMock: boolean;

  constructor(private configService: ConfigService) {
    this.apiEndpoint = this.configService.get<string>('WATI_API_ENDPOINT');
    this.apiToken = this.configService.get<string>('WATI_API_TOKEN');
    this.useMock = this.configService.get<string>('MOCK_INTEGRATIONS') === 'true';
  }

  async sendTemplateMessage(
    whatsappNumber: string,
    templateName: string,
    parameters: WatiTemplateParam[],
  ): Promise<{ success: boolean; messageId?: string; responseData: any }> {
    // Format whatsapp number to ensure it has no + or spaces
    const cleanNumber = whatsappNumber.replace(/[+\s-]/g, '');

    if (this.useMock || !this.apiToken || this.apiToken.includes('placeholder')) {
      this.logger.log(
        `[MOCK WATI WHATSAPP] Sending template '${templateName}' to ${cleanNumber}. Params: ${JSON.stringify(
          parameters,
        )}`,
      );
      return {
        success: true,
        messageId: `wati_msg_${Math.random().toString(36).substring(2, 15)}`,
        responseData: { status: 'mock_sent', timestamp: new Date() },
      };
    }

    try {
      const response = await axios.post(
        `${this.apiEndpoint}/api/v1/sendTemplateMessage?whatsappNumber=${cleanNumber}`,
        {
          templateName,
          broadcastName: `SAJ_${templateName.toUpperCase()}`,
          parameters,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // WATI API success usually returns result: true or valid message details
      const success = response.data.result === true || response.data.valid === true || !!response.data.messageId;
      return {
        success,
        messageId: response.data.messageId || null,
        responseData: response.data,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send WATI WhatsApp template message: ${error.response?.data?.message || error.message}`,
      );
      return {
        success: false,
        responseData: error.response?.data || { error: error.message },
      };
    }
  }
}
