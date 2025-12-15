import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Publication } from './entities/publication.entity';
import { PublicationDescription } from './entities/publication-description.entity';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { PublicationWithDescriptionDto } from './dto/publication-with-description.dto';

@Injectable()
export class PublicationsService {
  constructor(
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>,
    @InjectRepository(PublicationDescription)
    private readonly descriptionRepository: Repository<PublicationDescription>,
  ) {}

  async create(createDto: CreatePublicationDto): Promise<PublicationWithDescriptionDto> {
    const publication = this.publicationRepository.create({
      meliItemId: createDto.meliItemId,
      title: createDto.title,
      price: createDto.price,
      status: createDto.status,
      availableQuantity: createDto.availableQuantity,
      soldQuantity: createDto.soldQuantity,
      categoryId: createDto.categoryId,
    });

    const savedPublication = await this.publicationRepository.save(publication);

    if (createDto.description) {
      const description = this.descriptionRepository.create({
        publication: savedPublication,
        description: createDto.description,
      });
      await this.descriptionRepository.save(description);
    }

    return this.findOne(savedPublication.id);
  }

  async findAll(): Promise<PublicationWithDescriptionDto[]> {
    const publications = await this.publicationRepository.find({
      relations: ['descriptions'],
      order: { createdAt: 'DESC' },
    });

    return publications.map((pub) => this.mapToDto(pub));
  }

  async findOne(id: string): Promise<PublicationWithDescriptionDto> {
    const publication = await this.publicationRepository.findOne({
      where: { id },
      relations: ['descriptions'],
    });

    if (!publication) {
      throw new NotFoundException(`Publication with ID ${id} not found`);
    }

    return this.mapToDto(publication);
  }

  async findByMeliItemId(meliItemId: string): Promise<PublicationWithDescriptionDto | null> {
    const publication = await this.publicationRepository.findOne({
      where: { meliItemId },
      relations: ['descriptions'],
    });

    return publication ? this.mapToDto(publication) : null;
  }

  async update(id: string, updateDto: Partial<CreatePublicationDto>): Promise<PublicationWithDescriptionDto> {
    const publication = await this.publicationRepository.findOne({
      where: { id },
    });

    if (!publication) {
      throw new NotFoundException(`Publication with ID ${id} not found`);
    }

    Object.assign(publication, updateDto);
    await this.publicationRepository.save(publication);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const publication = await this.publicationRepository.findOne({
      where: { id },
    });

    if (!publication) {
      throw new NotFoundException(`Publication with ID ${id} not found`);
    }

    await this.publicationRepository.remove(publication);
  }

  private mapToDto(publication: Publication): PublicationWithDescriptionDto {
    return {
      id: publication.id,
      meliItemId: publication.meliItemId,
      title: publication.title,
      price: Number(publication.price),
      status: publication.status,
      availableQuantity: publication.availableQuantity,
      soldQuantity: publication.soldQuantity,
      categoryId: publication.categoryId,
      createdAt: publication.createdAt,
      updatedAt: publication.updatedAt,
      descriptions: publication.descriptions?.map((desc) => ({
        id: desc.id,
        description: desc.description,
        metadata: desc.metadata,
        createdAt: desc.createdAt,
      })),
    };
  }
}

