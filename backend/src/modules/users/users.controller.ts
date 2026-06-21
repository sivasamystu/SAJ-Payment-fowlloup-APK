import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { User, UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @Get()
  @Roles('TENANT_ADMIN', 'SUPER_ADMIN')
  async findAll(@CurrentUser() user: User) {
    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Super Admins should query companies directly');
    }
    return this.usersService.findAllByCompany(user.companyId);
  }

  @Post()
  @Roles('TENANT_ADMIN')
  async create(
    @CurrentUser() user: User,
    @Body()
    createUserDto: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      mobileNumber?: string;
    },
  ) {
    return this.usersService.create({
      ...createUserDto,
      companyId: user.companyId,
    });
  }

  @Patch(':id')
  @Roles('TENANT_ADMIN')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body()
    updateUserDto: {
      name?: string;
      role?: UserRole;
      mobileNumber?: string;
      isActive?: boolean;
    },
  ) {
    return this.usersService.update(id, user.companyId, updateUserDto);
  }

  @Delete(':id')
  @Roles('TENANT_ADMIN')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.remove(id, user.companyId);
  }
}
