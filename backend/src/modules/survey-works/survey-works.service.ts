import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkStatus } from '@prisma/client';

@Injectable()
export class SurveyWorksService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, staffId?: string) {
    const filter: any = { companyId };
    if (staffId) {
      filter.assignedStaffId = staffId;
    }
    return this.prisma.surveyWork.findMany({
      where: filter,
      include: {
        customer: true,
        assignedStaff: true,
      },
      orderBy: { workDate: 'desc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const work = await this.prisma.surveyWork.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        assignedStaff: true,
        invoices: true,
      },
    });
    if (!work) {
      throw new NotFoundException('Survey work not found');
    }
    return work;
  }

  async create(
    companyId: string,
    data: {
      workDate: string | Date;
      workType: string;
      siteLocation: string;
      customerId: string;
      assignedStaffId?: string;
      remarks?: string;
    },
  ) {
    // Generate unique work number: SURV-YYYYMMDD-XXXX
    const dateObj = new Date(data.workDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateString = `${year}${month}${day}`;

    // Get count for the day to make serial serial suffix
    const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
    const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));

    const countToday = await this.prisma.surveyWork.count({
      where: {
        companyId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const suffix = String(countToday + 1).padStart(4, '0');
    const workNumber = `SURV-${dateString}-${suffix}`;

    return this.prisma.surveyWork.create({
      data: {
        companyId,
        workNumber,
        workDate: new Date(data.workDate),
        workType: data.workType,
        siteLocation: data.siteLocation,
        customerId: data.customerId,
        assignedStaffId: data.assignedStaffId || null,
        remarks: data.remarks || null,
        status: 'NEW',
      },
      include: {
        customer: true,
        assignedStaff: true,
      },
    });
  }

  async update(
    id: string,
    companyId: string,
    data: {
      workDate?: string | Date;
      workType?: string;
      siteLocation?: string;
      assignedStaffId?: string;
      status?: WorkStatus;
      remarks?: string;
    },
  ) {
    // Verify work exists
    const work = await this.findOne(id, companyId);

    const updateData: any = { ...data };
    if (data.workDate) {
      updateData.workDate = new Date(data.workDate);
    }

    if (data.status === 'COMPLETED' && work.status !== 'COMPLETED') {
      updateData.completionDate = new Date();
    }

    return this.prisma.surveyWork.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        assignedStaff: true,
      },
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.surveyWork.delete({
      where: { id },
    });
  }
}
