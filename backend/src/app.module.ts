import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { FirestoreModule } from './firestore/firestore.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SurveyWorksModule } from './modules/survey-works/survey-works.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    FirestoreModule,
    CompaniesModule,
    UsersModule,
    CustomersModule,
    SurveyWorksModule,
    InvoicesModule,
    IntegrationsModule,
    SchedulerModule,
    WebhooksModule,
    DashboardModule,
    AuthModule,
  ],
})
export class AppModule {}
