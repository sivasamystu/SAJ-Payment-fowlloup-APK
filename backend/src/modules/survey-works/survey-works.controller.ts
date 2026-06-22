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
import { SurveyWorksService } from './survey-works.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { User, WorkStatus } from '@prisma/client';

@Controller('survey-works')
@UseGuards(AuthGuard)
export class SurveyWorksController {
  constructor(private readonly surveyWorksService: SurveyWorksService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    if (user.role === 'STAFF') {
      // Staff only sees works assigned to them
      return this.surveyWorksService.findAll(user.companyId, user.id);
    }
    return this.surveyWorksService.findAll(user.companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const work = (await this.surveyWorksService.findOne(id, user.companyId)) as any;
    if (user.role === 'STAFF' && work.assignedStaffId !== user.id) {
      throw new ForbiddenException('You do not have access to view this survey work');
    }
    return work;
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body()
    createWorkDto: {
      workDate: string;
      workType: string;
      siteLocation: string;
      customerId: string;
      assignedStaffId?: string;
      remarks?: string;
    },
  ) {
    return this.surveyWorksService.create(user.companyId, createWorkDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body()
    updateWorkDto: {
      workDate?: string;
      workType?: string;
      siteLocation?: string;
      assignedStaffId?: string;
      status?: WorkStatus;
      remarks?: string;
    },
  ) {
    // If staff is editing, prevent changing assignment or company
    const work = (await this.surveyWorksService.findOne(id, user.companyId)) as any;
    if (user.role === 'STAFF') {
      if (work.assignedStaffId !== user.id) {
        throw new ForbiddenException('You can only update works assigned to you');
      }
      // Staff can only update status and remarks
      return this.surveyWorksService.update(id, user.companyId, {
        status: updateWorkDto.status,
        remarks: updateWorkDto.remarks,
      });
    }

    return this.surveyWorksService.update(id, user.companyId, updateWorkDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    if (user.role === 'STAFF') {
      throw new ForbiddenException('Staff members cannot delete survey works');
    }
    return this.surveyWorksService.remove(id, user.companyId);
  }
}
