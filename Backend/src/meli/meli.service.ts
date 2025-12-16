import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
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

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(MeliToken)
    private readonly meliTokenRepository: Repository<MeliToken>,
    private readonly publicationsService: PublicationsService,
  ) {}

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
      const accessToken = await this.ensureAccessToken();

      // Try first as item_id
      let actualItemId = itemId;
      let item: MeliItem;

      try {
        item = await this.fetchItem(itemId, accessToken);
      } catch (error: any) {
        if (error instanceof NotFoundException) {
          try {
            const items = await this.fetchItemsFromProduct(itemId, accessToken);
            if (items && items.length > 0) {
              actualItemId = items[0].id;
              item = await this.fetchItem(actualItemId, accessToken);
            } else {
              throw new NotFoundException(
                `No se encontro el item ni producto con ID ${itemId}. Verifica que el ID sea correcto.`,
              );
            }
          } catch (productError: any) {
            if (productError instanceof NotFoundException) {
              throw productError;
            }
            throw new NotFoundException(
              `No se encontro el item ni producto con ID ${itemId}. Verifica que el ID sea correcto.`,
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

  private async fetchItem(itemId: string, accessToken: string): Promise<MeliItem> {
    try {
      const response$ = this.httpService.get<MeliItem>(`${this.apiBase}/items/${itemId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const { data } = await firstValueFrom(response$);
      return data;
    } catch (error: any) {
      const statusCode = error?.response?.status || 500;
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Error fetching item from Mercado Libre';

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
      return null; // some items might not have description endpoint
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
      throw new InternalServerErrorException(
        `Error fetching items from product: ${error?.response?.data?.message || error?.message}`,
      );
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
