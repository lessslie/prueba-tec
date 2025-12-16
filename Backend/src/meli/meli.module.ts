import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeliService } from './meli.service';
import { MeliController } from './meli.controller';
import { MeliToken } from './entities/meli-token.entity';
import { PublicationsModule } from '../publications/publications.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([MeliToken]),
    PublicationsModule,
  ],
  controllers: [MeliController],
  providers: [MeliService],
  exports: [MeliService],
})
export class MeliModule {}


