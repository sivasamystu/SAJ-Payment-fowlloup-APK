import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAllByCompany(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(data: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    companyId: string;
    mobileNumber?: string;
  }) {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { id: data.id },
    });
    if (existing) {
      throw new BadRequestException('User with this UID already exists');
    }

    return this.prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        companyId: data.companyId,
        mobileNumber: data.mobileNumber,
      },
    });
  }

  async update(
    id: string,
    companyId: string,
    data: { name?: string; role?: UserRole; mobileNumber?: string; isActive?: boolean },
  ) {
    // Verify user belongs to same company
    const user = await this.findOne(id);
    if (user.companyId !== companyId) {
      throw new BadRequestException('Unauthorized user update request');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        mobileNumber: data.mobileNumber,
        isActive: data.isActive,
      },
    });
  }

  async remove(id: string, companyId: string) {
    const user = await this.findOne(id);
    if (user.companyId !== companyId) {
      throw new BadRequestException('Unauthorized user deletion request');
    }
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
