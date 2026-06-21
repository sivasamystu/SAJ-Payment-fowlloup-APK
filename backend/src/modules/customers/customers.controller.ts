import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { User } from '@prisma/client';

@Controller('customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.customersService.findAll(user.companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customersService.findOne(id, user.companyId);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body()
    createCustomerDto: {
      name: string;
      mobile: string;
      whatsapp: string;
      email?: string;
      address?: string;
      gstNumber?: string;
      companyName?: string;
      notes?: string;
    },
  ) {
    return this.customersService.create(user.companyId, createCustomerDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body()
    updateCustomerDto: {
      name?: string;
      mobile?: string;
      whatsapp?: string;
      email?: string;
      address?: string;
      gstNumber?: string;
      companyName?: string;
      notes?: string;
    },
  ) {
    return this.customersService.update(id, user.companyId, updateCustomerDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customersService.remove(id, user.companyId);
  }
}
