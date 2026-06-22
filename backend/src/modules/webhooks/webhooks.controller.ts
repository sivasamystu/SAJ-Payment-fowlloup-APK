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
import { FirestoreService } from '../../firestore/firestore.service';
import { RazorpayService } from '../integrations/razorpay.service';
import { InvoicesService } from '../invoices/invoices.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private firestoreService: FirestoreService,
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
      const invoicesSnap = await this.firestoreService.collection('invoices')
        .where('paymentLinkId', '==', paymentLinkId)
        .limit(1)
        .get();

      if (invoicesSnap.empty) {
        this.logger.warn(`No invoice found for payment link ID: ${paymentLinkId}`);
        return { status: 'invoice_not_found' };
      }

      const invoiceDoc = invoicesSnap.docs[0];
      const invoice = invoiceDoc.data();
      
      // Fetch customer details
      const customerDoc = await this.firestoreService.collection('customers').doc(invoice.customerId).get();
      invoice.customer = customerDoc.exists ? customerDoc.data() : null;

      if (invoice.status === 'PAID') {
        this.logger.log(`Invoice #${invoice.invoiceNumber} is already marked as PAID`);
        return { status: 'already_processed' };
      }

      // Update invoice, survey-work, and log payment atomically using Firestore batch
      const batch = this.firestoreService.db.batch();

      // 1. Update Invoice status
      const invoiceRef = this.firestoreService.collection('invoices').doc(invoice.id);
      batch.update(invoiceRef, {
        status: 'PAID',
        updatedAt: new Date().toISOString(),
      });

      // 2. If survey work is associated, update its status to PAID
      if (invoice.surveyWorkId) {
        const surveyWorkRef = this.firestoreService.collection('survey-works').doc(invoice.surveyWorkId);
        batch.update(surveyWorkRef, {
          status: 'PAID',
          updatedAt: new Date().toISOString(),
        });
      }

      // 3. Add payment log
      const paymentLogRef = this.firestoreService.collection('payment-logs').doc();
      const paymentLog = {
        id: paymentLogRef.id,
        companyId: invoice.companyId,
        invoiceId: invoice.id,
        amountPaid,
        transactionReference: paymentRef,
        source: 'WEBHOOK',
        rawPayload: payload || null,
        paymentDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      batch.set(paymentLogRef, paymentLog);

      // Commit batch operations
      await batch.commit();

      this.logger.log(`Invoice #${invoice.invoiceNumber} successfully paid and updated`);

      // Trigger Thank You Notification on WhatsApp (Template 5)
      try {
        if (invoice.customer) {
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
        }
      } catch (notiError) {
        this.logger.error(`Failed to send WhatsApp Payment Thank You: ${notiError.message}`);
      }
    }

    return { status: 'ok' };
  }
}
