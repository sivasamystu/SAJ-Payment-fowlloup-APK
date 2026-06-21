import { Module } from '@nestjs/common';
import { SurveyWorksService } from './survey-works.service';
import { SurveyWorksController } from './survey-works.controller';

@Module({
  controllers: [SurveyWorksController],
  providers: [SurveyWorksService],
  exports: [SurveyWorksService],
})
export class SurveyWorksModule {}
