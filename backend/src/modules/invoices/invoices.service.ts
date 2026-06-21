import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from '../integrations/razorpay.service';
import { WatiService, WatiTemplateParam } from '../integrations/wati.service';
import { PaymentStatus, ReminderType } from '@prisma/client';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private prisma: PrismaService,
    private razorpayService: RazorpayService,
    private watiService: WatiService,
  ) {}

  async findAll(companyId: string) {
    return this.prisma.invoice.findMany({
      where: { companyId },
      include: {
        customer: true,
        surveyWork: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        surveyWork: true,
        reminderHistories: {
          include: { triggeringUser: true },
          orderBy: { sentDate: 'desc' },
        },
        paymentLogs: true,
      },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
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

    const countToday = await this.prisma.invoice.count({
      where: {
        companyId,
        createdAt: {
          gte: new Date(new Date(dateObj).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(dateObj).setHours(23, 59, 59, 999)),
        },
      },
    });
    const suffix = String(countToday + 1).padStart(4, '0');
    const invoiceNumber = `INV-${dateString}-${suffix}`;

    // Get Customer
    const customer = await this.prisma.customer.findFirst({
      where: { id: data.customerId, companyId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // 3. Create Invoice placeholder in database
    const invoice = await this.prisma.invoice.create({
      data: {
        companyId,
        invoiceNumber,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: new Date(data.dueDate),
        customerId: data.customerId,
        surveyWorkId: data.surveyWorkId || null,
        amount,
        gstAmount,
        totalAmount,
        status: 'PENDING',
      },
    });

    // 4. Generate Razorpay Link
    let paymentLink = '';
    let paymentLinkId = '';
    try {
      const pl = await this.razorpayService.createPaymentLink(
        invoiceNumber,
        totalAmount,
        {
          name: customer.name,
          email: customer.email,
          contact: customer.whatsapp || customer.mobile,
        },
        new Date(data.dueDate),
      );
      paymentLink = pl.short_url;
      paymentLinkId = pl.id;

      // Update Invoice with payment details
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentLink, paymentLinkId },
      });
    } catch (err) {
      this.logger.error(`Razorpay generation failed for ${invoiceNumber}: ${err.message}`);
    }

    // 5. Update SurveyWork status to BILLED
    if (data.surveyWorkId) {
      await this.prisma.surveyWork.update({
        where: { id: data.surveyWorkId },
        data: { status: 'BILLED' },
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
          email: invoice.customer.email,
          contact: invoice.customer.whatsapp || invoice.customer.mobile,
        },
        new Date(invoice.dueDate),
      );

      return this.prisma.invoice.update({
        where: { id },
        data: {
          paymentLink: pl.short_url,
          paymentLinkId: pl.id,
        },
        include: { customer: true, surveyWork: true },
      });
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

    return this.prisma.reminderHistory.create({
      data: {
        companyId,
        invoiceId,
        customerId,
        type: reminderType,
        deliveryStatus: result.success ? 'SENT' : 'FAILED',
        watiResponse: result.responseData as any,
        triggeredBy: triggeredBy || null,
      },
    });
  }
}
