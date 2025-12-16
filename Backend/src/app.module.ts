import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { PublicationsModule } from './publications/publications.module';
import { MeliModule } from './meli/meli.module';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  imports: [DatabaseModule, PublicationsModule, MeliModule, AnalysisModule],
})
export class AppModule {}
