import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from '../integrations/razorpay.service';
import { InvoicesService } from '../invoices/invoices.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private prisma: PrismaService,
    private razorpayService: RazorpayService,
    private invoicesService: InvoicesService,
  ) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(
    @Req() req: Request,
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    this.logger.log(`Received Razorpay webhook event: ${payload?.event}`);

    // Verify signature
    // In production, we'd stringify body or parse raw body buffer.
    // For verification, we convert body to string if it is an object
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    
    const isValid = this.razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Razorpay webhook signature verification failed!');
      throw new BadRequestException('Invalid signature');
    }

    // Process event
    if (payload?.event === 'payment_link.paid') {
      const plinkEntity = payload.payload?.payment_link?.entity;
      const paymentEntity = payload.payload?.payment?.entity;

      if (!plinkEntity) {
        throw new BadRequestException('Payment link entity missing');
      }

      const paymentLinkId = plinkEntity.id;
      const paymentRef = paymentEntity?.id || `ref_${Date.now()}`;
      const amountPaid = Number(paymentEntity?.amount || plinkEntity.amount) / 100; // Razorpay uses paise

      // Find the invoice linked with this paymentLinkId
      const invoice = await this.prisma.invoice.findFirst({
        where: { paymentLinkId },
        include: { customer: true },
      });

      if (!invoice) {
        this.logger.warn(`No invoice found for payment link ID: ${paymentLinkId}`);
        return { status: 'invoice_not_found' };
      }

      if (invoice.status === 'PAID') {
        this.logger.log(`Invoice #${invoice.invoiceNumber} is already marked as PAID`);
        return { status: 'already_processed' };
      }

      // Update invoice and log payment
      await this.prisma.$transaction(async (tx) => {
        // Update Invoice status
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'PAID' },
        });

        // If survey work is associated, update its status to PAID
        if (invoice.surveyWorkId) {
          await tx.surveyWork.update({
            where: { id: invoice.surveyWorkId },
            data: { status: 'PAID' },
          });
        }

        // Add payment log
        await tx.paymentLog.create({
          data: {
            companyId: invoice.companyId,
            invoiceId: invoice.id,
            amountPaid,
            transactionReference: paymentRef,
            source: 'WEBHOOK',
            rawPayload: payload as any,
          },
        });
      });

      this.logger.log(`Invoice #${invoice.invoiceNumber} successfully paid and updated`);

      // Trigger Thank You Notification on WhatsApp (Template 5)
      try {
        const total = Number(invoice.totalAmount);
        await this.invoicesService.sendWatiNotification(
          invoice.id,
          invoice.customerId,
          invoice.companyId,
          'PAYMENT_RECEIVED',
          invoice.customer.whatsapp,
          [
            { name: 'customer_name', value: invoice.customer.name },
            { name: 'invoice_number', value: invoice.invoiceNumber },
            { name: 'amount', value: `INR ${total}` },
            { name: 'transaction_ref', value: paymentRef },
          ],
          null, // Auto webhook trigger
        );
      } catch (notiError) {
        this.logger.error(`Failed to send WhatsApp Payment Thank You: ${notiError.message}`);
      }
    }

    return { status: 'ok' };
  }
}
