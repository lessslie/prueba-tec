import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { PublicationsService } from './publications.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { PublicationWithDescriptionDto } from './dto/publication-with-description.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { ListPublicationsQueryDto } from './dto/list-publications-query.dto';

@ApiTags('publications')
@Controller('publications')
export class PublicationsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new publication' })
  @ApiBody({
    description: 'Publication payload',
    type: CreatePublicationDto,
    examples: {
      default: {
        summary: 'Example publication',
        value: {
          meliItemId: 'MLA123456789',
          title: 'Producto de prueba',
          price: 12345.67,
          status: 'active',
          availableQuantity: 10,
          soldQuantity: 3,
          categoryId: 'MLA1051',
          description: 'Descripción de prueba del producto.',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Publication created successfully',
    type: PublicationWithDescriptionDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createDto: CreatePublicationDto,
  ): Promise<PublicationWithDescriptionDto> {
    return this.publicationsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all publications' })
  @ApiResponse({
    status: 200,
    description: 'List of all publications',
    type: [PublicationWithDescriptionDto],
  })
  async findAll(
    @Query() query: ListPublicationsQueryDto,
  ): Promise<PublicationWithDescriptionDto[]> {
    return this.publicationsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a publication by ID' })
  @ApiParam({ name: 'id', description: 'Publication UUID' })
  @ApiResponse({
    status: 200,
    description: 'Publication found',
    type: PublicationWithDescriptionDto,
  })
  @ApiResponse({ status: 404, description: 'Publication not found' })
  async findOne(@Param('id') id: string): Promise<PublicationWithDescriptionDto> {
    return this.publicationsService.findOne(id);
  }

  @Get('meli/:meliItemId')
  @ApiOperation({ summary: 'Get a publication by Mercado Libre item ID' })
  @ApiParam({ name: 'meliItemId', description: 'Mercado Libre item ID (e.g., MLA123456789)' })
  @ApiResponse({
    status: 200,
    description: 'Publication found',
    type: PublicationWithDescriptionDto,
  })
  @ApiResponse({ status: 404, description: 'Publication not found' })
  async findByMeliItemId(
    @Param('meliItemId') meliItemId: string,
  ): Promise<PublicationWithDescriptionDto | null> {
    return this.publicationsService.findByMeliItemId(meliItemId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a publication' })
  @ApiParam({ name: 'id', description: 'Publication UUID' })
  @ApiResponse({
    status: 200,
    description: 'Publication updated successfully',
    type: PublicationWithDescriptionDto,
  })
  @ApiResponse({ status: 404, description: 'Publication not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePublicationDto,
  ): Promise<PublicationWithDescriptionDto> {
    return this.publicationsService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a publication' })
  @ApiParam({ name: 'id', description: 'Publication UUID' })
  @ApiResponse({ status: 204, description: 'Publication deleted successfully' })
  @ApiResponse({ status: 404, description: 'Publication not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.publicationsService.remove(id);
  }
}
