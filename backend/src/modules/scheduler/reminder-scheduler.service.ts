import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FirestoreService } from '../../firestore/firestore.service';
import { InvoicesService, PaymentStatus, ReminderType } from '../invoices/invoices.service';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private firestoreService: FirestoreService,
    private invoicesService: InvoicesService,
  ) {}

  // Run every day at 9:00 AM (local time)
  @Cron('0 9 * * *')
  async handleDailyReminders() {
    this.logger.log('Starting daily automated payment reminders checker...');
    
    // 1. Fetch all unpaid invoices
    const pendingInvoicesSnap = await this.firestoreService.collection('invoices')
      .where('status', 'in', ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'])
      .get();

    const pendingInvoices = [];
    for (const doc of pendingInvoicesSnap.docs) {
      const data = doc.data();
      // Fetch customer
      const customerDoc = await this.firestoreService.collection('customers').doc(data.customerId).get();
      const customer = customerDoc.exists ? customerDoc.data() : null;
      pendingInvoices.push({
        ...data,
        customer,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDayOfWeek = new Date().getDay(); // 0 = Sunday, 2 = Tuesday, 5 = Friday

    for (const invoice of pendingInvoices) {
      try {
        if (!invoice.customer) continue;

        // Calculate the difference in calendar days
        const invoiceDate = new Date(invoice.invoiceDate);
        invoiceDate.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - invoiceDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          continue; // Created today, Stage 1 handled on creation
        }

        // 2. Check if a reminder has already been sent today
        const alreadySentTodaySnap = await this.firestoreService.collection('reminder-history')
          .where('invoiceId', '==', invoice.id)
          .where('sentDate', '>=', today.toISOString())
          .where('deliveryStatus', '==', 'SENT')
          .limit(1)
          .get();

        if (!alreadySentTodaySnap.empty) {
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
    
    const failedRemindersSnap = await this.firestoreService.collection('reminder-history')
      .where('deliveryStatus', '==', 'FAILED')
      .where('retryCount', '<', 3)
      .get();

    const failedReminders = [];
    for (const doc of failedRemindersSnap.docs) {
      const data = doc.data();
      // Fetch invoice
      const invoiceDoc = await this.firestoreService.collection('invoices').doc(data.invoiceId).get();
      if (invoiceDoc.exists) {
        const invoiceData = invoiceDoc.data();
        // Fetch customer
        const customerDoc = await this.firestoreService.collection('customers').doc(invoiceData.customerId).get();
        const customer = customerDoc.exists ? customerDoc.data() : null;
        
        failedReminders.push({
          id: doc.id,
          ...data,
          invoice: {
            ...invoiceData,
            customer,
          },
        });
      }
    }

    for (const record of failedReminders) {
      try {
        if (!record.invoice.customer) continue;

        this.logger.log(
          `Retrying failed reminder ${record.type} for Invoice #${record.invoice.invoiceNumber} (Attempt ${
            (record.retryCount || 0) + 1
          })`,
        );

        const total = Number(record.invoice.totalAmount);
        const pl = record.invoice.paymentLink || 'No Link Generated';

        // Increment retry count
        const ref = this.firestoreService.collection('reminder-history').doc(record.id);
        await ref.update({
          retryCount: (record.retryCount || 0) + 1,
        });

        // Attempt send
        const result = await this.invoicesService.sendWatiNotification(
          record.invoiceId,
          record.customerId,
          record.companyId,
          record.type as ReminderType,
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
          // Update status to SENT
          await ref.update({
            deliveryStatus: 'SENT',
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
