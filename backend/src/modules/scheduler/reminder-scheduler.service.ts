import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PaymentStatus, ReminderType } from '@prisma/client';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private invoicesService: InvoicesService,
  ) {}

  // Run every day at 9:00 AM (local time)
  // For easy dev verification, we can configure this or trigger manually via api
  @Cron('0 9 * * *')
  async handleDailyReminders() {
    this.logger.log('Starting daily automated payment reminders checker...');
    
    // 1. Fetch all unpaid invoices
    const pendingInvoices = await this.prisma.invoice.findMany({
      where: {
        status: {
          in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] as PaymentStatus[],
        },
      },
      include: {
        customer: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDayOfWeek = new Date().getDay(); // 0 = Sunday, 2 = Tuesday, 5 = Friday

    for (const invoice of pendingInvoices) {
      try {
        // Calculate the difference in calendar days
        const invoiceDate = new Date(invoice.invoiceDate);
        invoiceDate.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - invoiceDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          continue; // Created today, Stage 1 handled on creation
        }

        // 2. Check if a reminder has already been sent today to prevent duplicate notifications
        const alreadySentToday = await this.prisma.reminderHistory.findFirst({
          where: {
            invoiceId: invoice.id,
            sentDate: {
              gte: today,
            },
            deliveryStatus: 'SENT',
          },
        });

        if (alreadySentToday) {
          this.logger.log(`Reminder already dispatched today for Invoice #${invoice.invoiceNumber}. Skipping.`);
          continue;
        }

        let reminderType: ReminderType | null = null;

        // Stage 2: After 1 day
        if (diffDays === 1) {
          reminderType = 'GENTLE_REMINDER';
        }
        // Stage 3: After 3 days
        else if (diffDays === 3) {
          reminderType = 'PENDING_PAYMENT';
        }
        // Stage 4: After 5 days
        else if (diffDays === 5) {
          reminderType = 'OVERDUE_PAYMENT';
        }
        // Stage 5: After 5 days, continue reminders on Tuesday (2) and Friday (5)
        else if (diffDays > 5) {
          if (currentDayOfWeek === 2 || currentDayOfWeek === 5) {
            reminderType = 'OVERDUE_PAYMENT';
          }
        }

        if (reminderType) {
          this.logger.log(
            `Triggering automated ${reminderType} for Invoice #${invoice.invoiceNumber} (Day ${diffDays})`,
          );

          const total = Number(invoice.totalAmount);
          const pl = invoice.paymentLink || 'No Link Generated';

          await this.invoicesService.sendWatiNotification(
            invoice.id,
            invoice.customerId,
            invoice.companyId,
            reminderType,
            invoice.customer.whatsapp,
            [
              { name: 'customer_name', value: invoice.customer.name },
              { name: 'invoice_number', value: invoice.invoiceNumber },
              { name: 'amount', value: `INR ${total}` },
              { name: 'due_date', value: new Date(invoice.dueDate).toLocaleDateString() },
              { name: 'payment_link', value: pl },
            ],
            null, // Auto-triggered, so no staff user ID
          );
        }
      } catch (err) {
        this.logger.error(`Error processing reminder for Invoice ${invoice.invoiceNumber}: ${err.message}`);
      }
    }

    // 3. Auto retry failed messages
    await this.retryFailedMessages();
  }

  // Find failed notifications and retry (up to 3 times)
  async retryFailedMessages() {
    this.logger.log('Checking for failed WhatsApp reminders to retry...');
    
    const failedReminders = await this.prisma.reminderHistory.findMany({
      where: {
        deliveryStatus: 'FAILED',
        retryCount: {
          lt: 3,
        },
      },
      include: {
        invoice: {
          include: { customer: true },
        },
      },
    });

    for (const record of failedReminders) {
      try {
        this.logger.log(
          `Retrying failed reminder ${record.type} for Invoice #${record.invoice.invoiceNumber} (Attempt ${
            record.retryCount + 1
          })`,
        );

        const total = Number(record.invoice.totalAmount);
        const pl = record.invoice.paymentLink || 'No Link Generated';

        // Increment retry count
        await this.prisma.reminderHistory.update({
          where: { id: record.id },
          data: {
            retryCount: record.retryCount + 1,
          },
        });

        // Attempt send
        const templateMapping = {
          PAYMENT_REQUEST: 'saj_payment_request',
          GENTLE_REMINDER: 'saj_gentle_reminder',
          PENDING_PAYMENT: 'saj_pending_payment',
          OVERDUE_PAYMENT: 'saj_overdue_payment',
          PAYMENT_RECEIVED: 'saj_payment_thankyou',
        };

        const result = await this.invoicesService.sendWatiNotification(
          record.invoiceId,
          record.customerId,
          record.companyId,
          record.type,
          record.invoice.customer.whatsapp,
          [
            { name: 'customer_name', value: record.invoice.customer.name },
            { name: 'invoice_number', value: record.invoice.invoiceNumber },
            { name: 'amount', value: `INR ${total}` },
            { name: 'due_date', value: new Date(record.invoice.dueDate).toLocaleDateString() },
            { name: 'payment_link', value: pl },
          ],
          record.triggeredBy,
        );

        if (result.deliveryStatus === 'SENT') {
          // Deactivate the old failed one
          await this.prisma.reminderHistory.update({
            where: { id: record.id },
            data: { deliveryStatus: 'SENT' }, // Update status or mark as resolved
          });
        }
      } catch (err) {
        this.logger.error(`Retry failed for reminder record ${record.id}: ${err.message}`);
      }
    }
  }

  // Developer utility endpoint helper to trigger cron jobs manually in dev mode
  async forceTriggerJob() {
    await this.handleDailyReminders();
    return { status: 'triggered_successfully' };
  }
}
