import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Check if route has roles requirement
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    // Local/Mock Development check
    const useMock = process.env.MOCK_INTEGRATIONS === 'true';

    if (!authHeader) {
      if (useMock) {
        // Log in as a default tenant admin mock user for convenience
        let mockUser = await this.prisma.user.findFirst({
          include: { company: true },
        });

        if (!mockUser) {
          // Auto seed standard mock companies and users if db is empty during dev run
          const company = await this.prisma.company.create({
            data: { name: 'SAJ Surveys Demo Corp', subscriptionStatus: 'active' },
          });

          mockUser = await this.prisma.user.create({
            data: {
              id: 'mock_uid_123',
              email: 'admin@sajsurveys.com',
              name: 'SAJ Admin',
              role: 'TENANT_ADMIN',
              companyId: company.id,
              mobileNumber: '+919876543210',
            },
            include: { company: true },
          });
        }

        request.user = mockUser;
        return this.matchRoles(requiredRoles, mockUser.role);
      }
      throw new UnauthorizedException('Authorization header is missing');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

    try {
      let uid: string;
      let email: string;
      let name: string;

      if (useMock && token.startsWith('mock_')) {
        uid = token;
        email = `${token}@example.com`;
        name = `${token.replace('mock_', '')} User`;
      } else {
        // In real execution, we verify Firebase JWT Token
        // admin.auth().verifyIdToken(token)
        // Here we mock the token decoding for simplicity, checking header contents
        // A standard base64 decoding of the Firebase JWT is mimicked
        uid = token; // use token as uid for simulation
        email = 'staff@sajsurveys.com';
        name = 'Staff Member';
      }

      // Check DB for this user
      let dbUser = await this.prisma.user.findUnique({
        where: { id: uid },
        include: { company: true },
      });

      // If user does not exist in DB yet but validated by Firebase, create user
      if (!dbUser) {
        // Find or create default demo company for new mock users
        let defaultCompany = await this.prisma.company.findFirst();
        if (!defaultCompany) {
          defaultCompany = await this.prisma.company.create({
            data: { name: 'SAJ Surveys Demo Corp' },
          });
        }

        dbUser = await this.prisma.user.create({
          data: {
            id: uid,
            email,
            name,
            role: 'STAFF',
            companyId: defaultCompany.id,
          },
          include: { company: true },
        });
      }

      if (!dbUser.isActive) {
        throw new ForbiddenException('User account is disabled');
      }

      // Attach user to Request
      request.user = dbUser;

      // Match Roles
      return this.matchRoles(requiredRoles, dbUser.role);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  private matchRoles(requiredRoles: string[], userRole: string): boolean {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
