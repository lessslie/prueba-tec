import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { PublicationsModule } from '../publications/publications.module';
import { PublicationAnalysis } from './entities/publication-analysis.entity';

@Module({
  imports: [PublicationsModule, TypeOrmModule.forFeature([PublicationAnalysis])],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}

