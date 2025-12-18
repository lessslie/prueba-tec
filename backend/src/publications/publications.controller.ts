import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { ListPublicationsQueryDto } from './dto/list-publications-query.dto';
import { PublishMeliDto } from './dto/publish-meli.dto';
import { PublicationWithDescriptionDto } from './dto/publication-with-description.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { PublicationsService } from './publications.service';

@ApiTags('publications')
@Controller('publications')
export class PublicationsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new publication' })
  @ApiBody({ description: 'Publication payload', type: CreatePublicationDto })
  @ApiResponse({ status: 201, description: 'Publication created successfully', type: PublicationWithDescriptionDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createDto: CreatePublicationDto, @Req() req: any): Promise<PublicationWithDescriptionDto> {
    return this.publicationsService.create(createDto, req.user?.userId ?? null);
  }

  @Post('meli')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create and publish an item in Mercado Libre' })
  @ApiBody({ type: PublishMeliDto })
  @ApiResponse({
    status: 201,
    description: 'Publication created in Mercado Libre and persisted locally',
    type: PublicationWithDescriptionDto,
  })
  async createAndPublish(
    @Body() createDto: PublishMeliDto,
    @Req() req: any,
  ): Promise<PublicationWithDescriptionDto> {
    return this.publicationsService.createAndPublishToMeli(createDto, req.user?.userId ?? null);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all publications' })
  @ApiResponse({ status: 200, description: 'List of all publications', type: [PublicationWithDescriptionDto] })
  async findAll(
    @Query() query: ListPublicationsQueryDto,
    @Req() req: any,
  ): Promise<PublicationWithDescriptionDto[]> {
    return this.publicationsService.findAll(query, req.user?.userId ?? null);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a publication by ID' })
  @ApiParam({ name: 'id', description: 'Publication UUID' })
  @ApiResponse({ status: 200, description: 'Publication found', type: PublicationWithDescriptionDto })
  @ApiResponse({ status: 404, description: 'Publication not found' })
  async findOne(@Param('id') id: string, @Req() req: any): Promise<PublicationWithDescriptionDto> {
    return this.publicationsService.findOne(id, req.user?.userId ?? null);
  }

  @Get('meli/:meliItemId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a publication by Mercado Libre item ID' })
  @ApiParam({ name: 'meliItemId', description: 'Mercado Libre item ID (e.g., MLA123456789)' })
  @ApiResponse({ status: 200, description: 'Publication found', type: PublicationWithDescriptionDto })
  @ApiResponse({ status: 404, description: 'Publication not found' })
  async findByMeliItemId(
    @Param('meliItemId') meliItemId: string,
    @Req() req: any,
  ): Promise<PublicationWithDescriptionDto | null> {
    return this.publicationsService.findByMeliItemId(meliItemId, req.user?.userId ?? null);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a publication' })
  @ApiParam({ name: 'id', description: 'Publication UUID' })
  @ApiResponse({ status: 200, description: 'Publication updated successfully', type: PublicationWithDescriptionDto })
  @ApiResponse({ status: 404, description: 'Publication not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePublicationDto,
    @Req() req: any,
  ): Promise<PublicationWithDescriptionDto> {
    return this.publicationsService.update(id, updateDto, req.user?.userId ?? null);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a publication' })
  @ApiParam({ name: 'id', description: 'Publication UUID' })
  @ApiResponse({ status: 204, description: 'Publication deleted successfully' })
  @ApiResponse({ status: 404, description: 'Publication not found' })
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.publicationsService.remove(id, req.user?.userId ?? null);
  }
}
