import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { MeliTokenResponse } from './dto/meli-token-response.dto';
import { MeliToken } from './entities/meli-token.entity';
import { MeliItem, MeliItemDescription } from './interfaces/meli-item.interface';
import { PublicationsService } from '../publications/publications.service';

@Injectable()
export class MeliService {
  private readonly apiBase = 'https://api.mercadolibre.com';
  private readonly tokenExpiryBufferMs = 60_000; // refresh 1 min before expiry
  private readonly logger = new Logger(MeliService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(MeliToken)
    private readonly meliTokenRepository: Repository<MeliToken>,
    private readonly publicationsService: PublicationsService,
  ) {}

  async getProfile() {
    const latestToken = await this.getLatestToken();
    const accessToken = await this.ensureAccessToken();

    try {
      const response$ = this.httpService.get<{ id: number; nickname?: string; status?: any }>(
        `${this.apiBase}/users/me`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const { data } = await firstValueFrom(response$);
      return {
        id: data.id,
        nickname: data.nickname,
        status: data?.status?.site_status ?? null,
        expiresAt: latestToken.expiresAt,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        throw new UnauthorizedException('Token de Mercado Libre invalido o expirado. Reautentica via /meli/auth.');
      }
      throw new InternalServerErrorException('No se pudo obtener el perfil de Mercado Libre');
    }
  }

  async listOwnItems(params?: { limit?: number; offset?: number; includeFilters?: boolean }) {
    const accessToken = await this.ensureAccessToken();
    const profile = await this.getProfile();

    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    if (params?.includeFilters) query.append('include_filters', 'true');

    const url = `${this.apiBase}/users/${profile.id}/items/search${query.toString() ? `?${query.toString()}` : ''}`;

    try {
      const response$ = this.httpService.get<{
        results: string[];
        paging?: { total: number; limit: number; offset: number };
      }>(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const { data } = await firstValueFrom(response$);
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        throw new UnauthorizedException('Token de Mercado Libre invalido o expirado. Reautentica via /meli/auth.');
      }
      throw new InternalServerErrorException('No se pudo obtener el listado de items del vendedor.');
    }
  }

  getAuthUrl(state?: string): string {
    const clientId = this.getClientId();
    const redirectUri = this.getRedirectUri();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
    });

    if (state) {
      params.append('state', state);
    }

    return `https://auth.mercadolibre.com/authorization?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<MeliToken> {
    const tokenResponse = await this.exchangeCodeForToken(code);
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    const token = this.meliTokenRepository.create({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: tokenResponse.token_type,
      scope: tokenResponse.scope ?? null,
      userId: tokenResponse.user_id,
      expiresAt,
    });

    return this.meliTokenRepository.save(token);
  }

  async importItem(itemId: string) {
    try {
      const parsedId = this.extractItemOrProductId(itemId);
      const accessToken = await this.ensureAccessToken();

      // Try first as item_id
      let actualItemId = parsedId;
      let item: MeliItem;

      try {
        item = await this.fetchItem(parsedId, accessToken);
      } catch (error: any) {
        if (error instanceof NotFoundException) {
          try {
            const items = await this.fetchItemsFromProduct(parsedId, accessToken);
            if (items && items.length > 0) {
              actualItemId = items[0].id;
              item = await this.fetchItem(actualItemId, accessToken);
            } else {
              throw new NotFoundException(
                `No se encontro el item ni producto con ID ${parsedId}. Verifica que el ID sea correcto.`,
              );
            }
          } catch (productError: any) {
            if (productError instanceof NotFoundException) {
              throw productError;
            }
            throw new NotFoundException(
              `No se encontro el item ni producto con ID ${parsedId}. Verifica que el ID sea correcto.`,
            );
          }
        } else {
          throw error;
        }
      }

      const description = await this.fetchItemDescription(actualItemId, accessToken);
      const plainDescription = description?.plain_text || description?.text || '';

      return this.publicationsService.upsertFromMeli({
        meliItemId: item.id,
        title: item.title,
        price: item.price,
        status: item.status,
        availableQuantity: item.available_quantity,
        soldQuantity: item.sold_quantity,
        categoryId: item.category_id,
        description: plainDescription || undefined,
        metadata: { rawItem: item, rawDescription: description },
      });
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error importing item ${itemId}: ${error?.message || error?.toString() || 'Unknown error'}`,
      );
    }
  }

  private extractItemOrProductId(raw: string): string {
    if (!raw || !raw.trim()) {
      throw new BadRequestException('Provea un itemId, productId o URL de Mercado Libre');
    }

    const decoded = decodeURIComponent(raw.trim());

    // If a full URL is provided, search on it; otherwise search on the raw string
    const target = decoded.startsWith('http') ? decoded : ` ${decoded} `;

    const match = target.match(/(ML[A-Z]{0,2}-?\d{5,})/i);
    if (match && match[1]) {
      return match[1].replace('-', '').toUpperCase();
    }

    throw new BadRequestException(
      'No se pudo extraer el itemId/productId de Mercado Libre. Usa un ID (MLA123...) o pega la URL completa.',
    );
  }

  private async fetchItem(itemId: string, accessToken: string): Promise<MeliItem> {
    try {
      const response$ = this.httpService.get<MeliItem>(`${this.apiBase}/items/${itemId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const { data } = await firstValueFrom(response$);
      return data;
    } catch (error: any) {
      const statusCode = error?.response?.status || 500;
      this.logger.error(
        `fetchItem error status=${statusCode} msg=${error?.response?.data?.message || error?.message}`,
        error?.response?.data ? JSON.stringify(error.response.data) : undefined,
      );

      const blockedByPolicy =
        statusCode === 403 &&
        (error?.response?.data?.blocked_by === 'PolicyAgent' ||
          error?.response?.data?.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES');

      if (blockedByPolicy) {
        throw new ForbiddenException(
          'Mercado Libre bloquea este item por políticas (PolicyAgent). Prueba con otro ID.',
        );
      }

      // If token is forbidden/unauthorized, fallback to public GET (doesn't require auth for public items)
      if (statusCode === 401 || statusCode === 403) {
        this.logger.warn(`Falling back to public fetch for item ${itemId}`);
        const publicItem = await this.fetchItemPublic(itemId);
        if (publicItem) return publicItem;

        if (statusCode === 403) {
          throw new ForbiddenException(
            `Mercado Libre no permite acceder a este item (403 access_denied). Prueba con otro ID o revisa permisos de la app.`,
          );
        }
      }

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Error fetching item from Mercado Libre';

      if (statusCode === 401 || statusCode === 403) {
        throw new UnauthorizedException(
          'Token de Mercado Libre invalido o expirado. Reautentica via /meli/auth.',
        );
      }

      if (statusCode === 404) {
        throw new NotFoundException(`Item ${itemId} not found in Mercado Libre`);
      }

      throw new InternalServerErrorException(
        `Error fetching item from Mercado Libre: ${errorMessage} (Status: ${statusCode})`,
      );
    }
  }

  private async fetchItemDescription(
    itemId: string,
    accessToken: string,
  ): Promise<MeliItemDescription | null> {
    try {
      const response$ = this.httpService.get<MeliItemDescription>(
        `${this.apiBase}/items/${itemId}/description`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const { data } = await firstValueFrom(response$);
      return data;
    } catch {
      // fallback without token (public)
      try {
        const response$ = this.httpService.get<MeliItemDescription>(
          `${this.apiBase}/items/${itemId}/description`,
        );
        const { data } = await firstValueFrom(response$);
        return data;
      } catch {
        return null; // some items might not have description endpoint
      }
    }
  }

  private async fetchItemsFromProduct(
    productId: string,
    accessToken: string,
  ): Promise<MeliItem[]> {
    try {
      const response$ = this.httpService.get<{ items: MeliItem[] }>(
        `${this.apiBase}/products/${productId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const { data } = await firstValueFrom(response$);
      return data.items || [];
    } catch (error: any) {
      this.logger.error(
        `fetchItemsFromProduct error status=${error?.response?.status} msg=${error?.response?.data?.message || error?.message}`,
        error?.response?.data ? JSON.stringify(error.response.data) : undefined,
      );

      // fallback to public call (products endpoint suele ser pÃºblico)
      try {
        const response$ = this.httpService.get<{ items: MeliItem[] }>(
          `${this.apiBase}/products/${productId}`,
        );
        const { data } = await firstValueFrom(response$);
        return data.items || [];
      } catch {
        // ignore and fallthrough to error handling below
      }

      const statusCode = error?.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        throw new UnauthorizedException(
          'Token de Mercado Libre invalido o expirado. Reautentica via /meli/auth.',
        );
      }
      throw new InternalServerErrorException(
        `Error fetching items from product: ${error?.response?.data?.message || error?.message}`,
      );
    }
  }

  private async fetchItemPublic(itemId: string): Promise<MeliItem | null> {
    try {
      const response$ = this.httpService.get<MeliItem>(`${this.apiBase}/items/${itemId}`);
      const { data } = await firstValueFrom(response$);
      return data;
    } catch (error: any) {
      const statusCode = error?.response?.status;
      if (statusCode === 404) {
        throw new NotFoundException(`Item ${itemId} not found in Mercado Libre`);
      }
      return null;
    }
  }

  private async exchangeCodeForToken(code: string): Promise<MeliTokenResponse> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const redirectUri = this.getRedirectUri();

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    try {
      const response$ = this.httpService.post<MeliTokenResponse>(
        `${this.apiBase}/oauth/token`,
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      const { data } = await firstValueFrom(response$);
      return data;
    } catch (error) {
      throw new InternalServerErrorException('Error exchanging code for token');
    }
  }

  private async getLatestToken(): Promise<MeliToken> {
    const token = await this.meliTokenRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    if (!token) {
      throw new NotFoundException('No Mercado Libre token stored. Please authenticate first.');
    }

    return token;
  }

  private async ensureAccessToken(): Promise<string> {
    const envToken = this.configService.get<string>('MELI_ACCESS_TOKEN');
    if (envToken) {
      return envToken;
    }

    const latestToken = await this.getLatestToken();
    const expiresSoon = latestToken.expiresAt.getTime() - this.tokenExpiryBufferMs <= Date.now();

    if (!expiresSoon) {
      return latestToken.accessToken;
    }

    if (!latestToken.refreshToken) {
      throw new UnauthorizedException(
        'Mercado Libre token expired and no refresh token available. Please re-authenticate via /meli/auth.',
      );
    }

    const refreshed = await this.refreshAccessToken(latestToken);
    return refreshed.accessToken;
  }

  private async refreshAccessToken(token: MeliToken): Promise<MeliToken> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refreshToken,
    });

    try {
      const response$ = this.httpService.post<MeliTokenResponse>(
        `${this.apiBase}/oauth/token`,
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      const { data } = await firstValueFrom(response$);

      token.accessToken = data.access_token;
      token.refreshToken = data.refresh_token || token.refreshToken;
      token.tokenType = data.token_type;
      token.scope = data.scope ?? token.scope ?? null;
      token.expiresAt = new Date(Date.now() + data.expires_in * 1000);

      return this.meliTokenRepository.save(token);
    } catch (error: any) {
      throw new UnauthorizedException(
        `Unable to refresh Mercado Libre token: ${error?.response?.data?.error_description || error?.message || 'Unknown error'}`,
      );
    }
  }

  async hasValidToken(): Promise<boolean> {
    const envToken = this.configService.get<string>('MELI_ACCESS_TOKEN');
    if (envToken) return true;

    try {
      const latestToken = await this.getLatestToken();
      const expiresSoon =
        latestToken.expiresAt.getTime() - this.tokenExpiryBufferMs <= Date.now();
      return !expiresSoon;
    } catch {
      return false;
    }
  }

  private getClientId(): string {
    const value = this.configService.get<string>('MELI_CLIENT_ID');
    if (!value) throw new InternalServerErrorException('MELI_CLIENT_ID is not configured');
    return value;
  }

  private getClientSecret(): string {
    const value = this.configService.get<string>('MELI_CLIENT_SECRET');
    if (!value) throw new InternalServerErrorException('MELI_CLIENT_SECRET is not configured');
    return value;
  }

  private getRedirectUri(): string {
    const value =
      this.configService.get<string>('MELI_REDIRECT_URI') ||
      'http://localhost:3001/meli/callback';
    return value;
  }
}
