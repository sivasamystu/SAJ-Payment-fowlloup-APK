import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.company.findMany({
      include: {
        _count: {
          select: { users: true, customers: true, invoices: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        users: true,
        customers: true,
      },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async create(data: { name: string; subscriptionPlan?: string }) {
    return this.prisma.company.create({
      data: {
        name: data.name,
        subscriptionPlan: data.subscriptionPlan || 'basic',
        subscriptionStatus: 'trial',
      },
    });
  }

  async updateSubscription(id: string, status: SubscriptionStatus, plan?: string) {
    return this.prisma.company.update({
      where: { id },
      data: {
        subscriptionStatus: status,
        subscriptionPlan: plan,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.company.delete({
      where: { id },
    });
  }
}
