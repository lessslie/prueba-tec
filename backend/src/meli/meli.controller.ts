import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MeliService } from './meli.service';
import { PublicationWithDescriptionDto } from '../publications/dto/publication-with-description.dto';
import { CallbackQueryDto } from './dto/callback-query.dto';
import { ImportItemParamsDto } from './dto/import-item.params';

@ApiTags('meli')
@Controller('meli')
export class MeliController {
  constructor(private readonly meliService: MeliService) {}

  @Get('auth')
  @ApiOperation({ summary: 'Redirect to Mercado Libre OAuth' })
  @ApiResponse({ status: 302, description: 'Redirect to Meli auth URL' })
  redirectToAuth(@Res() res: Response, @Query('state') state?: string) {
    const url = this.meliService.getAuthUrl(state);
    return res.redirect(url);
  }

  @Get('callback')
  @ApiOperation({ summary: 'OAuth callback from Mercado Libre' })
  @ApiResponse({ status: 200, description: 'Token stored successfully' })
  async handleCallback(@Query() query: CallbackQueryDto, @Res() res: Response) {
    await this.meliService.handleCallback(query.code);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = frontendUrl.includes('?')
      ? `${frontendUrl}&meli=connected`
      : `${frontendUrl}?meli=connected`;
    return res.redirect(redirectUrl);
  }

  @Get('status')
  @ApiOperation({ summary: 'Check if there is a valid Mercado Libre token stored' })
  @ApiResponse({ status: 200, description: 'Connection status', schema: { example: { connected: true } } })
  async status() {
    const connected = await this.meliService.hasValidToken();
    return { connected };
  }

  @Get('import/:itemId')
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
  async importItem(
    @Param() params: ImportItemParamsDto,
  ): Promise<PublicationWithDescriptionDto> {
    return this.meliService.importItem(params.itemId);
  }
}
