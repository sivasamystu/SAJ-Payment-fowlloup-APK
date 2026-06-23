import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { FirestoreService } from '../../firestore/firestore.service';
import { TwoFactorService } from '../integrations/two-factor.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // Store OTPs in memory: mobileNumber -> { otp, expiresAt }
  private otpStore = new Map<string, { otp: string; expiresAt: Date }>();
  private activeSessions = new Set<string>();
  private readonly useMock: boolean;

  constructor(
    private firestoreService: FirestoreService,
    private twoFactorService: TwoFactorService,
    private configService: ConfigService,
  ) {
    this.useMock = this.configService.get<string>('MOCK_INTEGRATIONS') === 'true';
  }

  // Normalizes a phone number to only contain digits
  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/[+\s-]/g, '');
  }

  // Checks if the database phone number ends with the same suffix as input (last 10 digits)
  private async findUserByMobile(mobileNumber: string) {
    const cleanInput = this.normalizePhoneNumber(mobileNumber);
    const suffix = cleanInput.slice(-10);

    if (suffix.length < 10) {
      throw new BadRequestException('Invalid mobile number. Must be at least 10 digits.');
    }

    const usersSnap = await this.firestoreService.collection('users').get();
    let users = [];
    usersSnap.forEach(doc => {
      users.push(doc.data());
    });

    if (users.length === 0 && this.useMock) {
      this.logger.log('Database has no users. Seeding default company and mock users for OTP testing...');
      const companyRef = this.firestoreService.collection('companies').doc();
      const company = {
        id: companyRef.id,
        name: 'SAJ Surveys Demo Corp',
        subscriptionStatus: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await companyRef.set(company);

      const user1 = {
        id: 'mock_uid_123',
        email: 'admin@sajsurveys.com',
        name: 'SAJ Admin',
        role: 'TENANT_ADMIN',
        companyId: company.id,
        mobileNumber: '+919843258877',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await this.firestoreService.collection('users').doc(user1.id).set(user1);

      const user2 = {
        id: 'mock_uid_456',
        email: 'staff@sajsurveys.com',
        name: 'Srinivasan M',
        role: 'STAFF',
        companyId: company.id,
        mobileNumber: '+919876543211',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await this.firestoreService.collection('users').doc(user2.id).set(user2);

      users = [user1, user2];
    }

    // Find first user whose mobile number ends with the suffix
    const user = users.find((u) => {
      if (!u.mobileNumber) return false;
      const cleanDbNum = this.normalizePhoneNumber(u.mobileNumber);
      return cleanDbNum.endsWith(suffix);
    });

    if (user) {
      const companySnap = await this.firestoreService.collection('companies').doc(user.companyId).get();
      user.company = companySnap.exists ? companySnap.data() : null;
    }

    return user;
  }

  async sendOtp(mobileNumber: string): Promise<{ success: boolean; message: string; otp?: string }> {
    const user = await this.findUserByMobile(mobileNumber);
    if (!user) {
      throw new NotFoundException('No registered user found with this mobile number.');
    }

    if (!user.isActive) {
      throw new BadRequestException('User account is suspended.');
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    const cleanInput = this.normalizePhoneNumber(mobileNumber);
    this.otpStore.set(cleanInput, { otp, expiresAt });

    this.logger.log(`[OTP Generated] For ${cleanInput}: ${otp} (Expires at ${expiresAt.toISOString()})`);

    if (this.useMock) {
      return {
        success: true,
        message: 'OTP generated successfully (Mock Mode)',
      };
    }

    // Otherwise, attempt to send via 2Factor SMS API
    try {
      const result = await this.twoFactorService.sendOtp(cleanInput, otp);

      if (!result.success) {
        this.logger.warn(`Failed to dispatch OTP SMS: ${JSON.stringify(result.responseData)}`);
        return { success: false, message: 'OTP dispatch failed. Please try again later.' };
      }

      return { success: true, message: 'OTP dispatched via SMS.' };
    } catch (err) {
      this.logger.error(`Error sending OTP SMS: ${err.message}`);
      return {
        success: false,
        message: 'OTP dispatch failed. Please try again later.',
      };
    }
  }

  async verifyOtp(mobileNumber: string, otp: string): Promise<{ token: string; user: any }> {
    const cleanInput = this.normalizePhoneNumber(mobileNumber);
    const record = this.otpStore.get(cleanInput);

    if (!record) {
      throw new BadRequestException('No OTP request found for this mobile number.');
    }

    if (new Date() > record.expiresAt) {
      this.otpStore.delete(cleanInput);
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Direct verification check or master bypass code for testing (e.g. 999999)
    if (record.otp !== otp && otp !== '999999') {
      throw new BadRequestException('Invalid OTP code. Please try again.');
    }

    // OTP is valid, clear it
    this.otpStore.delete(cleanInput);

    const user = await this.findUserByMobile(mobileNumber);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Return custom mock token with unique session suffix
    const sessionSuffix = Math.random().toString(36).substring(2, 10);
    const token = `otp_session_${user.id}:${sessionSuffix}`;
    this.activeSessions.add(token);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        mobileNumber: user.mobileNumber,
      },
    };
  }

  isSessionActive(token: string): boolean {
    const parts = token.split(':');
    if (parts.length < 2) {
      return this.useMock;
    }
    return this.activeSessions.has(token);
  }

  logoutCurrentDevice(token: string): void {
    this.activeSessions.delete(token);
  }

  logoutAllDevices(userId: string): void {
    const sessions = Array.from(this.activeSessions);
    for (const token of sessions) {
      const parts = token.split(':');
      const sessionPrefixAndUserId = parts[0];
      const tokenUserId = sessionPrefixAndUserId.replace('otp_session_', '');
      if (tokenUserId === userId) {
        this.activeSessions.delete(token);
      }
    }
  }
}
