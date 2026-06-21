import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.customer.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async create(
    companyId: string,
    data: {
      name: string;
      mobile: string;
      whatsapp: string;
      email?: string;
      address?: string;
      gstNumber?: string;
      companyName?: string;
      notes?: string;
    },
  ) {
    return this.prisma.customer.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async update(
    id: string,
    companyId: string,
    data: {
      name?: string;
      mobile?: string;
      whatsapp?: string;
      email?: string;
      address?: string;
      gstNumber?: string;
      companyName?: string;
      notes?: string;
    },
  ) {
    // Verify customer belongs to company
    await this.findOne(id, companyId);

    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    // Verify customer belongs to company
    await this.findOne(id, companyId);

    return this.prisma.customer.delete({
      where: { id },
    });
  }
}
