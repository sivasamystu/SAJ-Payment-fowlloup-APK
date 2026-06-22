import { Controller, Post, Body, HttpCode, HttpStatus, Logger, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { User } from '@prisma/client';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: { mobileNumber: string }) {
    this.logger.log(`Received send-otp request for mobile: ${body.mobileNumber}`);
    return this.authService.sendOtp(body.mobileNumber);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: { mobileNumber: string; otp: string }) {
    this.logger.log(`Received verify-otp request for mobile: ${body.mobileNumber}`);
    return this.authService.verifyOtp(body.mobileNumber, body.otp);
  }

  @Post('logout-device')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutDevice(@Req() request: Request) {
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        this.authService.logoutCurrentDevice(token);
      }
    }
    return { success: true, message: 'Logged out from this device successfully' };
  }

  @Post('logout-all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: User) {
    this.authService.logoutAllDevices(user.id);
    return { success: true, message: 'Logged out from all devices successfully' };
  }
}
