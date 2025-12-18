import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import OpenAI from 'openai';
import { Repository } from 'typeorm';
import { PublicationsService } from '../publications/publications.service';
import { AnalysisResponseDto } from './dto/analysis-response.dto';
import { PublicationAnalysis } from './entities/publication-analysis.entity';
import { Publication } from '../publications/entities/publication.entity';

@Injectable()
export class AnalysisService {
  private readonly client: OpenAI | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly publicationsService: PublicationsService,
    @InjectRepository(PublicationAnalysis)
    private readonly analysisRepository: Repository<PublicationAnalysis>,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async analyzePublication(
    publicationId: string,
    ownerUserId: string | null,
    options?: { force?: boolean },
  ): Promise<AnalysisResponseDto> {
    const publication = await this.publicationsService
      .findOne(publicationId, ownerUserId ?? undefined)
      .catch(() => null);
    if (!publication) {
      throw new NotFoundException(`Publication with ID ${publicationId} not found`);
    }

    const force = options?.force ?? false;

    if (!force) {
      const cached = await this.analysisRepository.findOne({
        where: { publication: { id: publicationId } },
        order: { createdAt: 'DESC' },
      });

      if (cached) {
        return cached.result;
      }
    }

    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey || !this.client) {
      throw new ServiceUnavailableException('OpenAI API key is not configured');
    }

    const descriptionText = publication.descriptions?.[0]?.description ?? '';

    const metrics = {
      stockStatus:
        publication.availableQuantity <= 2
          ? 'low'
          : publication.availableQuantity <= 5
            ? 'medium'
            : 'healthy',
      soldToStockRatio:
        publication.availableQuantity > 0
          ? Number((publication.soldQuantity / publication.availableQuantity).toFixed(2))
          : null,
    };

    const payload = {
      id: publication.id,
      title: publication.title,
      price: publication.price,
      status: publication.status,
      availableQuantity: publication.availableQuantity,
      soldQuantity: publication.soldQuantity,
      categoryId: publication.categoryId,
      metrics,
      description: descriptionText,
    };

    const prompt = [
      'Analiza la publicacion de Mercado Libre y devuelve recomendaciones claras en espanol.',
      'Responde solo en JSON con las claves: titleRecommendations, descriptionIssues, conversionOpportunities, commercialRisks.',
      'No agregues texto fuera del JSON.',
      'Datos de la publicacion:',
      JSON.stringify(payload, null, 2),
    ].join('\n');

    let completion;
    try {
      completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un experto en optimizacion de listings de e-commerce.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });
    } catch (err: any) {
      const quotaError = err?.status === 429 || err?.code === 'insufficient_quota';
      if (quotaError) {
        throw new ServiceUnavailableException(
          'Servicio externo de IA sin cuota o limitado. Revisa billing de OpenAI.',
        );
      }
      throw new ServiceUnavailableException('No se pudo obtener analisis de IA en este momento.');
    }

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error('No se recibio respuesta del modelo');
    }

    const parsed = JSON.parse(raw) as AnalysisResponseDto;

    const record = this.analysisRepository.create({
      publication: { id: publicationId } as Publication,
      result: parsed,
      model: completion.model || 'gpt-4o-mini',
    });
    await this.analysisRepository.save(record);

    return parsed;
  }
}
