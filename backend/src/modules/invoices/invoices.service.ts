import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { FirestoreService } from '../../firestore/firestore.service';
import { RazorpayService } from '../integrations/razorpay.service';
import { WatiService, WatiTemplateParam } from '../integrations/wati.service';

export type PaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type ReminderType =
  | 'PAYMENT_REQUEST'
  | 'GENTLE_REMINDER'
  | 'PENDING_PAYMENT'
  | 'OVERDUE_PAYMENT'
  | 'PAYMENT_RECEIVED';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private firestoreService: FirestoreService,
    private razorpayService: RazorpayService,
    private watiService: WatiService,
  ) {}

  async findAll(companyId: string) {
    const snap = await this.firestoreService.collection('invoices')
      .where('companyId', '==', companyId)
      .get();
    
    const invoices = [];
    for (const doc of snap.docs) {
      const invoice = doc.data() as any;
      
      // Fetch customer
      const customerSnap = await this.firestoreService.collection('customers').doc(invoice.customerId).get();
      const customer = customerSnap.exists ? customerSnap.data() as any : null;

      // Fetch surveyWork
      let surveyWork = null;
      if (invoice.surveyWorkId) {
        const surveyWorkSnap = await this.firestoreService.collection('survey-works').doc(invoice.surveyWorkId).get();
        surveyWork = surveyWorkSnap.exists ? surveyWorkSnap.data() as any : null;
      }

      invoices.push({
        ...invoice,
        customer,
        surveyWork,
      });
    }
    // Sort by createdAt desc
    return invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findOne(id: string, companyId: string): Promise<any> {
    const invoiceDoc = await this.firestoreService.collection('invoices').doc(id).get();
    if (!invoiceDoc.exists) {
      throw new NotFoundException('Invoice not found');
    }
    const invoice = invoiceDoc.data() as any;
    if (invoice.companyId !== companyId) {
      throw new NotFoundException('Invoice not found');
    }

    // Fetch customer
    const customerSnap = await this.firestoreService.collection('customers').doc(invoice.customerId).get();
    const customer = customerSnap.exists ? customerSnap.data() as any : null;

    // Fetch surveyWork
    let surveyWork = null;
    if (invoice.surveyWorkId) {
      const surveyWorkSnap = await this.firestoreService.collection('survey-works').doc(invoice.surveyWorkId).get();
      surveyWork = surveyWorkSnap.exists ? surveyWorkSnap.data() as any : null;
    }

    // Fetch reminderHistories
    const reminderHistoriesSnap = await this.firestoreService.collection('reminder-history')
      .where('invoiceId', '==', id)
      .get();
    
    const reminderHistories = [];
    for (const doc of reminderHistoriesSnap.docs) {
      const data = doc.data() as any;
      let triggeringUser = null;
      if (data.triggeredBy) {
        const userSnap = await this.firestoreService.collection('users').doc(data.triggeredBy).get();
        triggeringUser = userSnap.exists ? userSnap.data() as any : null;
      }
      reminderHistories.push({
        ...data,
        triggeringUser,
      });
    }
    // Sort reminderHistories by sentDate desc
    reminderHistories.sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());

    // Fetch paymentLogs
    const paymentLogsSnap = await this.firestoreService.collection('payment-logs')
      .where('invoiceId', '==', id)
      .get();
    const paymentLogs = paymentLogsSnap.docs.map(doc => doc.data() as any);

    return {
      ...invoice,
      customer,
      surveyWork,
      reminderHistories,
      paymentLogs,
    };
  }

  async create(
    companyId: string,
    staffId: string,
    data: {
      invoiceDate: string | Date;
      dueDate: string | Date;
      customerId: string;
      surveyWorkId?: string;
      amount: number;
    },
  ) {
    // 1. Calculations
    const gstRate = 0.18;
    const amount = Number(data.amount);
    const gstAmount = Number((amount * gstRate).toFixed(2));
    const totalAmount = Number((amount + gstAmount).toFixed(2));

    // 2. Generate Invoice Number (e.g., INV-20260621-0001)
    const dateObj = new Date(data.invoiceDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateString = `${year}${month}${day}`;

    // Query count of invoices created today
    const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999)).toISOString();

    const todayInvoices = await this.firestoreService.collection('invoices')
      .where('companyId', '==', companyId)
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .get();
    
    const countToday = todayInvoices.size;
    const suffix = String(countToday + 1).padStart(4, '0');
    const invoiceNumber = `INV-${dateString}-${suffix}`;

    // Get Customer
    const customerSnap = await this.firestoreService.collection('customers').doc(data.customerId).get();
    if (!customerSnap.exists) {
      throw new NotFoundException('Customer not found');
    }
    const customer = customerSnap.data() as any;
    if (customer.companyId !== companyId) {
      throw new NotFoundException('Customer not found');
    }

    // 3. Create Invoice document in Firestore
    const ref = this.firestoreService.collection('invoices').doc();
    const invoice = {
      id: ref.id,
      companyId,
      invoiceNumber,
      invoiceDate: new Date(data.invoiceDate).toISOString(),
      dueDate: new Date(data.dueDate).toISOString(),
      customerId: data.customerId,
      surveyWorkId: data.surveyWorkId || null,
      amount,
      gstAmount,
      totalAmount,
      status: 'PENDING' as PaymentStatus,
      paymentLink: '',
      paymentLinkId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ref.set(invoice);

    // 4. Generate Razorpay Link
    let paymentLink = '';
    let paymentLinkId = '';
    try {
      const pl = await this.razorpayService.createPaymentLink(
        invoiceNumber,
        totalAmount,
        {
          name: customer.name,
          email: customer.email || undefined,
          contact: customer.whatsapp || customer.mobile,
        },
        new Date(data.dueDate),
      );
      paymentLink = pl.short_url;
      paymentLinkId = pl.id;

      // Update Invoice with payment details
      invoice.paymentLink = paymentLink;
      invoice.paymentLinkId = paymentLinkId;
      await ref.update({ paymentLink, paymentLinkId, updatedAt: new Date().toISOString() });
    } catch (err) {
      this.logger.error(`Razorpay generation failed for ${invoiceNumber}: ${err.message}`);
    }

    // 5. Update SurveyWork status to BILLED
    if (data.surveyWorkId) {
      await this.firestoreService.collection('survey-works').doc(data.surveyWorkId).update({
        status: 'BILLED',
        updatedAt: new Date().toISOString(),
      });
    }

    // 6. Send Immediate WhatsApp Notification (Stage 1 - PAYMENT_REQUEST)
    if (paymentLink) {
      await this.sendWatiNotification(
        invoice.id,
        customer.id,
        companyId,
        'PAYMENT_REQUEST',
        customer.whatsapp,
        [
          { name: 'customer_name', value: customer.name },
          { name: 'invoice_number', value: invoiceNumber },
          { name: 'amount', value: `INR ${totalAmount}` },
          { name: 'due_date', value: new Date(data.dueDate).toLocaleDateString() },
          { name: 'payment_link', value: paymentLink },
        ],
        staffId,
      );
    }

    return this.findOne(invoice.id, companyId);
  }

  async regeneratePaymentLink(id: string, companyId: string) {
    const invoice = await this.findOne(id, companyId);
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already paid');
    }

    try {
      const pl = await this.razorpayService.createPaymentLink(
        invoice.invoiceNumber,
        Number(invoice.totalAmount),
        {
          name: invoice.customer.name,
          email: invoice.customer.email || undefined,
          contact: invoice.customer.whatsapp || invoice.customer.mobile,
        },
        new Date(invoice.dueDate),
      );

      const ref = this.firestoreService.collection('invoices').doc(id);
      await ref.update({
        paymentLink: pl.short_url,
        paymentLinkId: pl.id,
        updatedAt: new Date().toISOString(),
      });

      return this.findOne(id, companyId);
    } catch (err) {
      throw new BadRequestException(`Failed to regenerate link: ${err.message}`);
    }
  }

  async triggerManualReminder(
    id: string,
    companyId: string,
    reminderType: ReminderType,
    staffId: string,
  ) {
    const invoice = await this.findOne(id, companyId);
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cannot send reminders for paid invoices');
    }

    const templateMapping = {
      PAYMENT_REQUEST: 'saj_payment_request',
      GENTLE_REMINDER: 'saj_gentle_reminder',
      PENDING_PAYMENT: 'saj_pending_payment',
      OVERDUE_PAYMENT: 'saj_overdue_payment',
    };

    const templateName = templateMapping[reminderType];
    if (!templateName) {
      throw new BadRequestException(`Unsupported reminder type: ${reminderType}`);
    }

    const pl = invoice.paymentLink || 'No Link Generated';
    const total = Number(invoice.totalAmount);

    const params: WatiTemplateParam[] = [
      { name: 'customer_name', value: invoice.customer.name },
      { name: 'invoice_number', value: invoice.invoiceNumber },
      { name: 'amount', value: `INR ${total}` },
      { name: 'due_date', value: new Date(invoice.dueDate).toLocaleDateString() },
      { name: 'payment_link', value: pl },
    ];

    return this.sendWatiNotification(
      invoice.id,
      invoice.customer.id,
      companyId,
      reminderType,
      invoice.customer.whatsapp,
      params,
      staffId,
    );
  }

  // Common wrapper to invoke WATI WhatsApp sending and log history
  async sendWatiNotification(
    invoiceId: string,
    customerId: string,
    companyId: string,
    reminderType: ReminderType,
    whatsappNumber: string,
    params: WatiTemplateParam[],
    triggeredBy?: string,
  ) {
    const templateMapping = {
      PAYMENT_REQUEST: 'saj_payment_request',
      GENTLE_REMINDER: 'saj_gentle_reminder',
      PENDING_PAYMENT: 'saj_pending_payment',
      OVERDUE_PAYMENT: 'saj_overdue_payment',
      PAYMENT_RECEIVED: 'saj_payment_thankyou',
    };

    const templateName = templateMapping[reminderType];

    const result = await this.watiService.sendTemplateMessage(
      whatsappNumber,
      templateName,
      params,
    );

    const ref = this.firestoreService.collection('reminder-history').doc();
    const log = {
      id: ref.id,
      companyId,
      invoiceId,
      customerId,
      type: reminderType,
      sentDate: new Date().toISOString(),
      deliveryStatus: result.success ? 'SENT' : 'FAILED',
      watiResponse: result.responseData || null,
      triggeredBy: triggeredBy || null,
      createdAt: new Date().toISOString(),
    };
    await ref.set(log);
    return log;
  }
}
