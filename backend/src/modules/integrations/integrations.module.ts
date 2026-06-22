import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RazorpayService } from './razorpay.service';
import { WatiService } from './wati.service';
import { TwoFactorService } from './two-factor.service';

@Module({
  imports: [ConfigModule],
  providers: [RazorpayService, WatiService, TwoFactorService],
  exports: [RazorpayService, WatiService, TwoFactorService],
})
export class IntegrationsModule {}
