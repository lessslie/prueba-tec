import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Publication } from './entities/publication.entity';
import { PublicationDescription } from './entities/publication-description.entity';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { PublicationWithDescriptionDto } from './dto/publication-with-description.dto';
import { MeliPublicationPayload } from './interfaces/publication.interface';
import { ListPublicationsQueryDto } from './dto/list-publications-query.dto';
import { MeliService } from '../meli/meli.service';
import { PublishMeliDto } from './dto/publish-meli.dto';

@Injectable()
export class PublicationsService {
  private readonly logger = new Logger(PublicationsService.name);

  constructor(
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>,
    @InjectRepository(PublicationDescription)
    private readonly descriptionRepository: Repository<PublicationDescription>,
    @Inject(forwardRef(() => MeliService))
    private readonly meliService: MeliService,
  ) {}

  async createAndPublishToMeli(
    createDto: PublishMeliDto,
    ownerUserId: string | null,
  ): Promise<PublicationWithDescriptionDto> {
    if (!ownerUserId) {
      throw new ConflictException('Usuario no autenticado para publicar en Mercado Libre');
    }
    return this.meliService.createItemFromApp(
      {
        title: createDto.title,
        price: createDto.price,
        availableQuantity: createDto.availableQuantity,
        categoryId: createDto.categoryId,
        description: createDto.description,
        pictures: createDto.pictures,
      },
      ownerUserId,
    );
  }

  async create(
    createDto: CreatePublicationDto,
    ownerUserId: string | null,
  ): Promise<PublicationWithDescriptionDto> {
    const publication = this.publicationRepository.create({
      meliItemId: createDto.meliItemId,
      permalink: null,
      title: createDto.title,
      price: createDto.price,
      status: createDto.status,
      availableQuantity: createDto.availableQuantity,
      soldQuantity: createDto.soldQuantity,
      categoryId: createDto.categoryId,
      ownerUserId,
    });

    const savedPublication = await this.savePublication(publication);

    if (createDto.description) {
      const description = this.descriptionRepository.create({
        publication: savedPublication,
        description: createDto.description,
      });
      await this.descriptionRepository.save(description);
    }

    return this.findOne(savedPublication.id, ownerUserId ?? undefined);
  }

  async findAll(
    query: ListPublicationsQueryDto,
    ownerUserId: string | null,
  ): Promise<PublicationWithDescriptionDto[]> {
    const take = query?.limit ?? 50;
    const skip = query?.offset ?? 0;
    const publications = await this.publicationRepository.find({
      relations: ['descriptions'],
      order: { createdAt: 'DESC' },
      take,
      skip,
      where: ownerUserId ? { ownerUserId } : {},
    });

    return publications.map((pub) => this.mapToDto(pub));
  }

  async findOne(id: string, ownerUserId?: string): Promise<PublicationWithDescriptionDto> {
    const publication = await this.publicationRepository.findOne({
      where: { id },
      relations: ['descriptions'],
    });

    if (!publication || (ownerUserId && publication.ownerUserId && publication.ownerUserId !== ownerUserId)) {
      throw new NotFoundException(`Publication with ID ${id} not found`);
    }

    return this.mapToDto(publication);
  }

  async findByMeliItemId(
    meliItemId: string,
    ownerUserId?: string,
  ): Promise<PublicationWithDescriptionDto | null> {
    const publication = await this.publicationRepository.findOne({
      where: { meliItemId },
      relations: ['descriptions'],
    });

    if (!publication) return null;
    if (ownerUserId && publication.ownerUserId && publication.ownerUserId !== ownerUserId) return null;
    return this.mapToDto(publication);
  }

  async update(
    id: string,
    updateDto: UpdatePublicationDto,
    ownerUserId: string | null,
  ): Promise<PublicationWithDescriptionDto> {
    const publication = await this.publicationRepository.findOne({
      where: { id },
      relations: ['descriptions'],
    });

    if (!publication) {
      throw new NotFoundException(`Publication with ID ${id} not found`);
    }

    const { description, ...rest } = updateDto;

    // Si hay meliItemId y ownerUserId, intentamos actualizar tambien en Mercado Libre
    if (publication.meliItemId && ownerUserId) {
      try {
        const updated = await this.meliService.updateItemFromApp(
          {
            meliItemId: publication.meliItemId,
            title: rest.title ?? publication.title,
            price: rest.price ?? publication.price,
            availableQuantity: rest.availableQuantity ?? publication.availableQuantity,
            status: rest.status ?? publication.status,
            description: description ?? publication.descriptions?.[0]?.description ?? '',
          },
          ownerUserId,
        );
        return updated;
      } catch (error: any) {
        throw new BadRequestException(error?.message || 'No se pudo actualizar en Mercado Libre');
      }
    }

    Object.assign(publication, rest);
    if (ownerUserId) {
      publication.ownerUserId = ownerUserId;
    }
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

    return this.findOne(id, ownerUserId ?? undefined);
  }

  async pausePublication(id: string, ownerUserId: string | null): Promise<{ pausedInMeli: boolean }> {
    const publication = await this.publicationRepository.findOne({
      where: { id },
    });

    if (!publication) {
      throw new NotFoundException(`Publication with ID ${id} not found`);
    }

    if (ownerUserId && publication.ownerUserId && publication.ownerUserId !== ownerUserId) {
      throw new ConflictException('No puedes pausar publicaciones de otro usuario');
    }

    let pausedInMeli = false;

    // Intentar pausar en Mercado Libre
    if (publication.meliItemId && ownerUserId) {
      try {
        await this.meliService.pauseItem(publication.meliItemId, ownerUserId);
        pausedInMeli = true;
        this.logger.log(`Publication ${id} paused in Mercado Libre successfully`);
      } catch (error: any) {
        // Solo loguear el error, no bloquear el pausado local
        this.logger.warn(
          `Could not pause publication ${id} in Mercado Libre: ${error?.message}. Marking as paused locally anyway.`
        );
      }
    }

    // Marcar como pausada localmente
    publication.isPausedLocally = true;
    await this.publicationRepository.save(publication);

    return { pausedInMeli };
  }

  async activatePublication(id: string, ownerUserId: string | null): Promise<PublicationWithDescriptionDto> {
    const publication = await this.publicationRepository.findOne({
      where: { id },
    });

    if (!publication) {
      throw new NotFoundException(`Publication with ID ${id} not found`);
    }

    if (ownerUserId && publication.ownerUserId && publication.ownerUserId !== ownerUserId) {
      throw new ConflictException('No puedes activar publicaciones de otro usuario');
    }

    // Marcar como activa localmente
    publication.isPausedLocally = false;
    await this.publicationRepository.save(publication);

    this.logger.log(`Publication ${id} activated locally`);

    return this.findOne(id, ownerUserId ?? undefined);
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
      existing.permalink = payload.permalink ?? existing.permalink ?? null;
      if (payload.ownerUserId) existing.ownerUserId = payload.ownerUserId;
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

      return this.findOne(existing.id, payload.ownerUserId ?? undefined);
    }

    const publication = this.publicationRepository.create({
      meliItemId: payload.meliItemId,
      permalink: payload.permalink ?? null,
      title: payload.title,
      price: payload.price,
      status: payload.status,
      availableQuantity: payload.availableQuantity,
      soldQuantity: payload.soldQuantity,
      categoryId: payload.categoryId,
      ownerUserId: payload.ownerUserId ?? null,
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

    return this.findOne(savedPublication.id, payload.ownerUserId ?? undefined);
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
    let permalink = publication.permalink ?? null;

    if (!permalink && publication.meliItemId && /^MLA\d+$/i.test(publication.meliItemId)) {
      const numeric = publication.meliItemId.replace(/^MLA/i, '');
      permalink = `https://articulo.mercadolibre.com.ar/MLA-${numeric}`;
    }

    return {
      id: publication.id,
      meliItemId: publication.meliItemId,
      permalink,
      title: publication.title,
      price: Number(publication.price),
      status: publication.status,
      availableQuantity: publication.availableQuantity,
      soldQuantity: publication.soldQuantity,
      categoryId: publication.categoryId,
      isPausedLocally: publication.isPausedLocally,
      ownerUserId: publication.ownerUserId ?? null,
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
