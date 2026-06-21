import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(companyId: string) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // 1. Fetch Invoices for Company
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId },
      include: {
        customer: true,
        surveyWork: {
          include: { assignedStaff: true },
        },
      },
    });

    // 2. Fetch Payment Logs for Company
    const paymentLogs = await this.prisma.paymentLog.findMany({
      where: { companyId },
      orderBy: { paymentDate: 'desc' },
      take: 10,
      include: {
        invoice: {
          include: { customer: true },
        },
      },
    });

    // Aggregate core numbers
    let totalInvoiced = 0;
    let totalCollection = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let collectionThisMonth = 0;
    let collectionThisYear = 0;

    const agingBuckets = {
      days_0_7: 0,
      days_8_15: 0,
      days_16_30: 0,
      days_31_60: 0,
      days_above_60: 0,
    };

    const customerPendingMap = new Map<string, { name: string; pendingAmount: number }>();
    const staffPerformanceMap = new Map<string, { name: string; collected: number }>();

    for (const invoice of invoices) {
      const total = Number(invoice.totalAmount);
      totalInvoiced += total;

      // Status aggregation
      if (invoice.status === 'PAID') {
        totalCollection += total;

        // Check date
        const paymentDate = invoice.updatedAt; // Paid invoices updatedAt acts as payment timestamp
        if (paymentDate >= startOfMonth) {
          collectionThisMonth += total;
        }
        if (paymentDate >= startOfYear) {
          collectionThisYear += total;
        }

        // Staff performance
        if (invoice.surveyWork?.assignedStaff) {
          const staff = invoice.surveyWork.assignedStaff;
          const current = staffPerformanceMap.get(staff.id) || { name: staff.name, collected: 0 };
          current.collected += total;
          staffPerformanceMap.set(staff.id, current);
        }
      } else {
        // Pending or Overdue
        if (invoice.status === 'OVERDUE' || new Date(invoice.dueDate) < today) {
          totalOverdue += total;
        } else {
          totalPending += total;
        }

        // Customer Pending Map
        const customer = invoice.customer;
        const current = customerPendingMap.get(customer.id) || { name: customer.name, pendingAmount: 0 };
        current.pendingAmount += total;
        customerPendingMap.set(customer.id, current);

        // Aging classification (days since invoice date)
        const diffTime = Math.abs(today.getTime() - new Date(invoice.invoiceDate).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) agingBuckets.days_0_7 += total;
        else if (diffDays <= 15) agingBuckets.days_8_15 += total;
        else if (diffDays <= 30) agingBuckets.days_16_30 += total;
        else if (diffDays <= 60) agingBuckets.days_31_60 += total;
        else agingBuckets.days_above_60 += total;
      }
    }

    // Transform maps to lists & sort
    const topPendingCustomers = Array.from(customerPendingMap.values())
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .slice(0, 5);

    const staffPerformance = Array.from(staffPerformanceMap.values())
      .sort((a, b) => b.collected - a.collected);

    // Calculate Recovery Percentage
    const recoveryPercentage = totalInvoiced > 0 ? (totalCollection / totalInvoiced) * 100 : 0;

    // Monthly Collection Chart Data (past 6 months)
    const monthlyCollection = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const yearName = d.getFullYear().toString().substring(2);
      
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      // Sum collected in this month
      const collectedVal = invoices
        .filter(inv => inv.status === 'PAID' && inv.updatedAt >= mStart && inv.updatedAt <= mEnd)
        .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

      // Sum pending in this month
      const pendingVal = invoices
        .filter(inv => inv.status !== 'PAID' && inv.invoiceDate >= mStart && inv.invoiceDate <= mEnd)
        .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

      monthlyCollection.push({
        name: `${monthName} '${yearName}`,
        collected: collectedVal,
        pending: pendingVal,
      });
    }

    return {
      metrics: {
        totalInvoices: invoices.length,
        totalCollection,
        totalPending,
        totalOverdue,
        collectionThisMonth,
        collectionThisYear,
        recoveryPercentage: Number(recoveryPercentage.toFixed(1)),
      },
      agingBuckets,
      topPendingCustomers,
      staffPerformance,
      recentPayments: paymentLogs.map(log => ({
        id: log.id,
        invoiceNumber: log.invoice.invoiceNumber,
        customerName: log.invoice.customer.name,
        amount: Number(log.amountPaid),
        paymentDate: log.paymentDate,
        ref: log.transactionReference,
      })),
      monthlyCollection,
    };
  }
}
