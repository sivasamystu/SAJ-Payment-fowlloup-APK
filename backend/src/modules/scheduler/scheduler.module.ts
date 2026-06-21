import { Module, Controller, Post, UseGuards } from '@nestjs/common';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { InvoicesModule } from '../invoices/invoices.module';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('scheduler')
@UseGuards(AuthGuard)
export class SchedulerController {
  constructor(private schedulerService: ReminderSchedulerService) {}

  @Post('trigger')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN')
  async triggerScheduler() {
    return this.schedulerService.forceTriggerJob();
  }
}

@Module({
  imports: [InvoicesModule],
  controllers: [SchedulerController],
  providers: [ReminderSchedulerService],
  exports: [ReminderSchedulerService],
})
export class SchedulerModule {}
