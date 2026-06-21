import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { InvoicesModule } from '../invoices/invoices.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [InvoicesModule, IntegrationsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
