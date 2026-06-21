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
import { CompaniesService } from './companies.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { User, SubscriptionStatus } from '@prisma/client';

@Controller('companies')
@UseGuards(AuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  async findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    if (user.role !== 'SUPER_ADMIN' && user.companyId !== id) {
      throw new ForbiddenException('You do not have access to this company record');
    }
    return this.companiesService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  async create(@Body() createCompanyDto: { name: string; subscriptionPlan?: string }) {
    return this.companiesService.create(createCompanyDto);
  }

  @Patch(':id/subscription')
  @Roles('SUPER_ADMIN')
  async updateSubscription(
    @Param('id') id: string,
    @Body() updateDto: { status: SubscriptionStatus; plan?: string },
  ) {
    return this.companiesService.updateSubscription(id, updateDto.status, updateDto.plan);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
