import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Publication } from './entities/publication.entity';
import { PublicationDescription } from './entities/publication-description.entity';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { PublicationWithDescriptionDto } from './dto/publication-with-description.dto';
import { MeliPublicationPayload } from './interfaces/publication.interface';
import { ListPublicationsQueryDto } from './dto/list-publications-query.dto';

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

    const savedPublication = await this.savePublication(publication);

    if (createDto.description) {
      const description = this.descriptionRepository.create({
        publication: savedPublication,
        description: createDto.description,
      });
      await this.descriptionRepository.save(description);
    }

    return this.findOne(savedPublication.id);
  }

  async findAll(query?: ListPublicationsQueryDto): Promise<PublicationWithDescriptionDto[]> {
    const take = query?.limit ?? 50;
    const skip = query?.offset ?? 0;
    const publications = await this.publicationRepository.find({
      relations: ['descriptions'],
      order: { createdAt: 'DESC' },
      take,
      skip,
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

  async update(id: string, updateDto: UpdatePublicationDto): Promise<PublicationWithDescriptionDto> {
    const publication = await this.publicationRepository.findOne({
      where: { id },
      relations: ['descriptions'],
    });

    if (!publication) {
      throw new NotFoundException(`Publication with ID ${id} not found`);
    }

    const { description, ...rest } = updateDto;
    Object.assign(publication, rest);
    await this.savePublication(publication);

    if (description !== undefined) {
      const existingDescription = publication.descriptions?.[0];
      if (existingDescription) {
        existingDescription.description = description;
        await this.descriptionRepository.save(existingDescription);
      } else {
        const newDescription = this.descriptionRepository.create({
          publication,
          description,
        });
        await this.descriptionRepository.save(newDescription);
      }
    }

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

  async upsertFromMeli(payload: MeliPublicationPayload): Promise<PublicationWithDescriptionDto> {
    const existing = await this.publicationRepository.findOne({
      where: { meliItemId: payload.meliItemId },
      relations: ['descriptions'],
    });

    if (existing) {
      existing.title = payload.title;
      existing.price = payload.price;
      existing.status = payload.status;
      existing.availableQuantity = payload.availableQuantity;
      existing.soldQuantity = payload.soldQuantity;
      existing.categoryId = payload.categoryId;
      await this.publicationRepository.save(existing);

      if (payload.description) {
        const existingDescription = existing.descriptions?.[0];
        if (existingDescription) {
          existingDescription.description = payload.description;
          existingDescription.metadata = payload.metadata ?? null;
          await this.descriptionRepository.save(existingDescription);
        } else {
          const newDescription = this.descriptionRepository.create({
            publication: existing,
            description: payload.description,
            metadata: payload.metadata ?? null,
          });
          await this.descriptionRepository.save(newDescription);
        }
      }

      return this.findOne(existing.id);
    }

    const publication = this.publicationRepository.create({
      meliItemId: payload.meliItemId,
      title: payload.title,
      price: payload.price,
      status: payload.status,
      availableQuantity: payload.availableQuantity,
      soldQuantity: payload.soldQuantity,
      categoryId: payload.categoryId,
    });

    const savedPublication = await this.publicationRepository.save(publication);

    if (payload.description) {
      const description = this.descriptionRepository.create({
        publication: savedPublication,
        description: payload.description,
        metadata: payload.metadata ?? null,
      });
      await this.descriptionRepository.save(description);
    }

    return this.findOne(savedPublication.id);
  }

  private async savePublication(publication: Publication): Promise<Publication> {
    try {
      return await this.publicationRepository.save(publication);
    } catch (error) {
      this.handleQueryError(error);
    }
  }

  private handleQueryError(error: unknown): never {
    const isUniqueMeliId =
      error instanceof QueryFailedError && (error as any)?.code === '23505';

    if (isUniqueMeliId) {
      throw new ConflictException('A publication with this Mercado Libre item ID already exists');
    }

    throw error;
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
