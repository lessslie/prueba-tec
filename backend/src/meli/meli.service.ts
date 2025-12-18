import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ForbiddenException,
  Inject,
  forwardRef,
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
    @Inject(forwardRef(() => PublicationsService))
    private readonly publicationsService: PublicationsService,
  ) {}

  async getProfile(ownerUserId: string) {
    const latestToken = await this.getLatestToken(ownerUserId);
    const accessToken = await this.ensureAccessToken(ownerUserId);

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

  async listOwnItems(params: { ownerUserId: string; limit?: number; offset?: number; includeFilters?: boolean }) {
    const accessToken = await this.ensureAccessToken(params.ownerUserId);
    const profile = await this.getProfile(params.ownerUserId);

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

  getAuthUrl(ownerUserId: string, state?: string): string {
    const clientId = this.getClientId();
    const redirectUri = this.getRedirectUri();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: ownerUserId,
    });

    if (state) {
      params.append('app_state', state);
    }

    return `https://auth.mercadolibre.com/authorization?${params.toString()}`;
  }

  async handleCallback(code: string, state?: string): Promise<MeliToken> {
    const ownerUserId = state || null;
    const tokenResponse = await this.exchangeCodeForToken(code);
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    const token = this.meliTokenRepository.create({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: tokenResponse.token_type,
      scope: tokenResponse.scope ?? null,
      userId: tokenResponse.user_id,
      ownerUserId,
      expiresAt,
    });

    return this.meliTokenRepository.save(token);
  }

  async importItem(itemId: string, ownerUserId: string) {
    try {
      const parsedId = this.extractItemOrProductId(itemId);
      const accessToken = await this.ensureAccessToken(ownerUserId);

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
        permalink: item.permalink ?? null,
        title: item.title,
        price: item.price,
        status: item.status,
        availableQuantity: item.available_quantity,
        soldQuantity: item.sold_quantity,
        categoryId: item.category_id,
        description: plainDescription || undefined,
        metadata: { rawItem: item, rawDescription: description },
        ownerUserId,
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

    const match = target.match(/(ML[A-Z]{0,2})-?(\d{5,})/i);
    if (match && match[1]) {
      return `${match[1].toUpperCase()}${match[2]}`;
    }

    throw new BadRequestException(
      'No se pudo extraer el itemId/productId de Mercado Libre. Usa un ID (MLA123...) o pega la URL completa.',
    );
  }

  async createItemFromApp(payload: {
    title: string;
    price: number;
    availableQuantity: number;
    categoryId: string;
    description?: string;
    pictures?: string[];
  }, ownerUserId: string) {
    const accessToken = await this.ensureAccessToken(ownerUserId);

    // Validar que la categoría sea hoja
    const categoryDetail = await this.getCategoryDetail(payload.categoryId);
    if (categoryDetail?.children_categories?.length) {
      throw new BadRequestException('La categoría seleccionada no es hoja. Elige una subcategoría.');
    }

    const baseAttributes = [
      { id: 'BRAND', value_name: 'Genérico' },
      { id: 'MODEL', value_name: 'Modelo genérico' },
    ];

    // Atributos mínimos obligatorios para celulares (MLA1055) que causaban error 400
    if (payload.categoryId === 'MLA1055') {
      baseAttributes.push(
        { id: 'COLOR', value_name: 'Negro' },
        { id: 'IS_DUAL_SIM', value_name: 'Sí' },
        { id: 'CARRIER', value_name: 'Liberado' },
      );
    }

    const body = {
      title: payload.title,
      category_id: payload.categoryId,
      price: payload.price,
      currency_id: 'ARS',
      available_quantity: payload.availableQuantity,
      buying_mode: 'buy_it_now',
      condition: 'new',
      listing_type_id: 'gold_special',
      shipping: { mode: 'not_specified' },
      attributes: baseAttributes,
      pictures:
        payload.pictures && payload.pictures.length > 0
          ? payload.pictures.map((src) => ({ source: src }))
          : [
              {
                source:
                  'https://http2.mlstatic.com/storage/developers-site-cms-admin/openapi/319968618063-test_image.jpg',
              },
            ],
    };

    try {
      const response$ = this.httpService.post<{ id: string }>(`${this.apiBase}/items`, body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const { data } = await firstValueFrom(response$);
      if (payload.description) {
        try {
          const description$ = this.httpService.post(
            `${this.apiBase}/items/${data.id}/description`,
            { plain_text: payload.description },
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          await firstValueFrom(description$);
        } catch (error: any) {
          const descriptionMsg = error?.response?.data?.message || error?.message || 'Error desconocido';
          this.logger.error(
            `createItemFromApp description error status=${error?.response?.status} msg=${descriptionMsg}`,
            error?.response?.data ? JSON.stringify(error.response.data) : undefined,
          );
          throw new BadRequestException(
            `No se pudo guardar la descripcion en Mercado Libre: ${descriptionMsg}`,
          );
        }
      }
      const createdItem = await this.fetchItem(data.id, accessToken);
      const description = await this.fetchItemDescription(data.id, accessToken);

      return this.publicationsService.upsertFromMeli({
        meliItemId: createdItem.id,
        permalink: createdItem.permalink ?? null,
        title: createdItem.title,
        price: createdItem.price,
        status: createdItem.status,
        availableQuantity: createdItem.available_quantity,
        soldQuantity: createdItem.sold_quantity,
        categoryId: createdItem.category_id,
        description: description?.plain_text || description?.text || payload.description,
        metadata: { rawItem: createdItem, rawDescription: description },
        ownerUserId,
      });
    } catch (error: any) {
      this.logger.error(
        `createItemFromApp error status=${error?.response?.status} msg=${error?.response?.data?.message || error?.message}`,
        error?.response?.data ? JSON.stringify(error.response.data) : undefined,
      );
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        throw new UnauthorizedException(
          'Token de Mercado Libre invalido o expirado. Reautentica via /meli/auth.',
        );
      }
      throw new InternalServerErrorException(
        `No se pudo crear la publicacion en Mercado Libre: ${error?.response?.data?.message || error?.message || 'Error desconocido'}`,
      );
    }
  }

  async updateItemFromApp(
    payload: {
      meliItemId: string;
      title?: string;
      price?: number;
      availableQuantity?: number;
      status?: string;
      description?: string;
    },
    ownerUserId: string,
  ) {
    const accessToken = await this.ensureAccessToken(ownerUserId);
    const body: Record<string, any> = {};
    if (payload.title) body.title = payload.title;
    if (payload.price !== undefined) body.price = payload.price;
    if (payload.availableQuantity !== undefined) body.available_quantity = payload.availableQuantity;
    if (payload.status) body.status = payload.status;

    try {
      if (Object.keys(body).length > 0) {
        const update$ = this.httpService.put(`${this.apiBase}/items/${payload.meliItemId}`, body, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        await firstValueFrom(update$);
      }

      if (payload.description !== undefined) {
        const description$ = this.httpService.post(
          `${this.apiBase}/items/${payload.meliItemId}/description`,
          { plain_text: payload.description },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        await firstValueFrom(description$);
      }

      const updatedItem = await this.fetchItem(payload.meliItemId, accessToken);
      const description = await this.fetchItemDescription(payload.meliItemId, accessToken);
      return this.publicationsService.upsertFromMeli({
        meliItemId: updatedItem.id,
        permalink: updatedItem.permalink ?? null,
        title: updatedItem.title,
        price: updatedItem.price,
        status: updatedItem.status,
        availableQuantity: updatedItem.available_quantity,
        soldQuantity: updatedItem.sold_quantity,
        categoryId: updatedItem.category_id,
        description: description?.plain_text || description?.text || payload.description,
        metadata: { rawItem: updatedItem, rawDescription: description },
        ownerUserId,
      });
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error desconocido';
      this.logger.error(
        `updateItemFromApp error status=${error?.response?.status} msg=${msg}`,
        error?.response?.data ? JSON.stringify(error.response.data) : undefined,
      );
      throw new InternalServerErrorException(
        `No se pudo actualizar la publicacion en Mercado Libre: ${msg}`,
      );
    }
  }

  async pauseItem(meliItemId: string, ownerUserId: string) {
    const accessToken = await this.ensureAccessToken(ownerUserId);
    try {
      const pause$ = this.httpService.put(
        `${this.apiBase}/items/${meliItemId}`,
        { status: 'paused' },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      await firstValueFrom(pause$);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error desconocido';
      this.logger.error(
        `pauseItem error status=${error?.response?.status} msg=${msg}`,
        error?.response?.data ? JSON.stringify(error.response.data) : undefined,
      );
      throw new InternalServerErrorException(
        `No se pudo pausar la publicacion en Mercado Libre: ${msg}`,
      );
    }
  }

  async getCategories(parentId?: string) {
    try {
      if (parentId) {
        const detail = await this.getCategoryDetail(parentId);
        return detail?.children_categories || [];
      }
      const response$ = this.httpService.get<{ id: string; name: string }[]>(
        `${this.apiBase}/sites/MLA/categories`,
      );
      const { data } = await firstValueFrom(response$);
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      const isPolicy =
        status === 403 &&
        (error?.response?.data?.blocked_by === 'PolicyAgent' ||
          error?.response?.data?.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES');

      const fallbackRoots = [
        { id: 'MLA5725', name: 'Accesorios para Vehículos' },
        { id: 'MLA1512', name: 'Agro' },
        { id: 'MLA1403', name: 'Alimentos y Bebidas' },
        { id: 'MLA1071', name: 'Animales y Mascotas' },
        { id: 'MLA1367', name: 'Antigüedades y Colecciones' },
        { id: 'MLA1368', name: 'Arte, Librería y Mercería' },
        { id: 'MLA1743', name: 'Autos, Motos y Otros' },
        { id: 'MLA1384', name: 'Bebés' },
        { id: 'MLA1246', name: 'Belleza y Cuidado Personal' },
        { id: 'MLA1039', name: 'Cámaras y Accesorios' },
        { id: 'MLA1051', name: 'Celulares y Teléfonos' },
        { id: 'MLA1648', name: 'Computación' },
        { id: 'MLA1144', name: 'Consolas y Videojuegos' },
        { id: 'MLA1500', name: 'Construcción' },
        { id: 'MLA1276', name: 'Deportes y Fitness' },
        { id: 'MLA5726', name: 'Electrodomésticos y Aires Ac.' },
        { id: 'MLA1000', name: 'Electrónica, Audio y Video' },
        { id: 'MLA2547', name: 'Entradas para Eventos' },
        { id: 'MLA407134', name: 'Herramientas' },
        { id: 'MLA1574', name: 'Hogar, Muebles y Jardín' },
        { id: 'MLA1499', name: 'Industrias y Oficinas' },
        { id: 'MLA1459', name: 'Inmuebles' },
        { id: 'MLA1182', name: 'Instrumentos Musicales' },
        { id: 'MLA3937', name: 'Joyas y Relojes' },
        { id: 'MLA1132', name: 'Juegos y Juguetes' },
        { id: 'MLA3025', name: 'Libros, Revistas y Comics' },
        { id: 'MLA1168', name: 'Música, Películas y Series' },
        { id: 'MLA1430', name: 'Ropa y Accesorios' },
        { id: 'MLA409431', name: 'Salud y Equipamiento Médico' },
        { id: 'MLA1540', name: 'Servicios' },
        { id: 'MLA9304', name: 'Souvenirs, Cotillón y Fiestas' },
        { id: 'MLA1953', name: 'Otras categorías' },
      ];

      if (isPolicy) {
        if (parentId) {
          throw new BadRequestException(
            'Mercado Libre bloquea las subcategorías desde esta red. Ingresá manualmente un ID de categoría hoja (ej. MLA1055).',
          );
        }
        // Fallback a raíz estática para no romper el frontend
        return fallbackRoots;
      }

      throw new InternalServerErrorException('No se pudieron obtener las categorías');
    }
  }

  private async getCategoryDetail(categoryId: string) {
    const response$ = this.httpService.get<{ id: string; name: string; children_categories: any[] }>(
      `${this.apiBase}/categories/${categoryId}`,
    );
    const { data } = await firstValueFrom(response$);
    return data;
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

  private async getLatestToken(ownerUserId: string): Promise<MeliToken> {
    const token = await this.meliTokenRepository.findOne({
      where: { ownerUserId },
      order: { createdAt: 'DESC' },
    });

    if (!token) {
      throw new NotFoundException('No Mercado Libre token stored. Please authenticate first.');
    }

    return token;
  }

  private async ensureAccessToken(ownerUserId: string): Promise<string> {
    const envToken = this.configService.get<string>('MELI_ACCESS_TOKEN');
    if (envToken) {
      return envToken;
    }

    const latestToken = await this.getLatestToken(ownerUserId);
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

  async hasValidToken(ownerUserId?: string): Promise<boolean> {
    const envToken = this.configService.get<string>('MELI_ACCESS_TOKEN');
    if (envToken) return true;

    if (!ownerUserId) return false;

    try {
      const latestToken = await this.getLatestToken(ownerUserId);
      const expiresSoon = latestToken.expiresAt.getTime() - this.tokenExpiryBufferMs <= Date.now();
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
