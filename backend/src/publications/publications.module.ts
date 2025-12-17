import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Publication } from './entities/publication.entity';
import { PublicationDescription } from './entities/publication-description.entity';
import { PublicationsService } from './publications.service';
import { PublicationsController } from './publications.controller';
import { MeliModule } from '../meli/meli.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Publication, PublicationDescription]),
    forwardRef(() => MeliModule),
  ],
  controllers: [PublicationsController],
  providers: [PublicationsService],
  exports: [PublicationsService],
})
export class PublicationsModule {}

