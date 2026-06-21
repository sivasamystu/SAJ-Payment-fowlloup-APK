import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { User, ReminderType } from '@prisma/client';

@Controller('invoices')
@UseGuards(AuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.invoicesService.findAll(user.companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.invoicesService.findOne(id, user.companyId);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body()
    createInvoiceDto: {
      invoiceDate: string;
      dueDate: string;
      customerId: string;
      surveyWorkId?: string;
      amount: number;
    },
  ) {
    return this.invoicesService.create(user.companyId, user.id, createInvoiceDto);
  }

  @Post(':id/regenerate-link')
  async regenerateLink(@Param('id') id: string, @CurrentUser() user: User) {
    return this.invoicesService.regeneratePaymentLink(id, user.companyId);
  }

  @Post(':id/send-reminder')
  async sendReminder(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('type') reminderType: ReminderType,
  ) {
    return this.invoicesService.triggerManualReminder(
      id,
      user.companyId,
      reminderType,
      user.id,
    );
  }
}
