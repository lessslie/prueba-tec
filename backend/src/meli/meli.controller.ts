import { Controller, Get, Param, Query, Res, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MeliService } from './meli.service';
import { PublicationWithDescriptionDto } from '../publications/dto/publication-with-description.dto';
import { CallbackQueryDto } from './dto/callback-query.dto';
import { ImportItemParamsDto } from './dto/import-item.params';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('meli')
@Controller('meli')
export class MeliController {
  constructor(private readonly meliService: MeliService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener perfil del usuario de Mercado Libre autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil básico del usuario conectado' })
  async me(@Req() req: any) {
    return this.meliService.getProfile(req.user.userId);
  }

  @Get('my-items')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar items del vendedor autenticado' })
  @ApiQuery({ name: 'limit', required: false, description: 'Cantidad a devolver (por defecto 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset para paginado (por defecto 0)' })
  @ApiQuery({
    name: 'includeFilters',
    required: false,
    description: 'Incluye filtros disponibles (puede hacer la respuesta más pesada)',
  })
  async myItems(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('includeFilters') includeFilters?: string,
  ) {
    return this.meliService.listOwnItems({
      ownerUserId: req.user.userId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      includeFilters: includeFilters?.toString().toLowerCase() === 'true',
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorías (raíces o hijas de una categoría)' })
  @ApiQuery({ name: 'parent', required: false, description: 'ID de la categoría padre. Si no se envía, devuelve raíces.' })
  async categories(@Query('parent') parent?: string) {
    return this.meliService.getCategories(parent);
  }

  @Get('auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Redirect to Mercado Libre OAuth' })
  @ApiResponse({ status: 302, description: 'Redirect to Meli auth URL' })
  redirectToAuth(@Res() res: Response, @Req() req: any, @Query('state') state?: string) {
    const url = this.meliService.getAuthUrl(req.user.userId, state);
    return res.redirect(url);
  }

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Mercado Libre OAuth URL' })
  @ApiResponse({ status: 200, description: 'OAuth URL' })
  authUrl(@Req() req: any, @Query('state') state?: string) {
    return { url: this.meliService.getAuthUrl(req.user.userId, state) };
  }

  @Get('callback')
  @ApiOperation({ summary: 'OAuth callback from Mercado Libre' })
  @ApiResponse({ status: 200, description: 'Token stored successfully' })
  async handleCallback(@Query() query: CallbackQueryDto, @Res() res: Response) {
    await this.meliService.handleCallback(query.code, query.state);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = frontendUrl.includes('?')
      ? `${frontendUrl}&meli=connected`
      : `${frontendUrl}?meli=connected`;
    return res.redirect(redirectUrl);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if there is a valid Mercado Libre token stored' })
  @ApiResponse({ status: 200, description: 'Connection status', schema: { example: { connected: true } } })
  async status(@Req() req: any) {
    const connected = await this.meliService.hasValidToken(req.user.userId);
    return { connected };
  }

  @Get('import/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Import a publication from Mercado Libre and persist it' })
  @ApiParam({
    name: 'itemId',
    description: 'Mercado Libre item ID (e.g., MLA123456789)',
    example: 'MLA123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Publication imported and stored',
    type: PublicationWithDescriptionDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found in Mercado Libre' })
  @ApiResponse({ status: 401, description: 'Invalid or expired access token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async importItem(@Param() params: ImportItemParamsDto, @Req() req: any): Promise<PublicationWithDescriptionDto> {
    return this.meliService.importItem(params.itemId, req.user.userId);
  }
}
