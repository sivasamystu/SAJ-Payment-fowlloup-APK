import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SurveyWorksModule } from './modules/survey-works/survey-works.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CompaniesModule,
    UsersModule,
    CustomersModule,
    SurveyWorksModule,
    InvoicesModule,
    IntegrationsModule,
    SchedulerModule,
    WebhooksModule,
    DashboardModule,
  ],
})
export class AppModule {}
