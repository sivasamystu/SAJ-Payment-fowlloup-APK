import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RazorpayService } from './razorpay.service';
import { WatiService } from './wati.service';

@Module({
  imports: [ConfigModule],
  providers: [RazorpayService, WatiService],
  exports: [RazorpayService, WatiService],
})
export class IntegrationsModule {}
