import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { PublicationsModule } from './publications/publications.module';

@Module({
  imports: [DatabaseModule, PublicationsModule],
})
export class AppModule {}
