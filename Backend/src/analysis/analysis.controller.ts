import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { AnalysisResponseDto } from './dto/analysis-response.dto';

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('publication/:id')
  @ApiOperation({ summary: 'Analyze a publication and return LLM recommendations' })
  @ApiParam({ name: 'id', description: 'Publication UUID' })
  @ApiQuery({
    name: 'force',
    required: false,
    description: 'If true, forces a new LLM call even if a cached analysis exists',
    type: Boolean,
  })
  @ApiResponse({ status: 200, type: AnalysisResponseDto })
  async analyzePublication(
    @Param('id') id: string,
    @Query('force') force?: string,
  ): Promise<AnalysisResponseDto> {
    const forceFlag = (force ?? '').toString().toLowerCase() === 'true';
    return this.analysisService.analyzePublication(id, { force: forceFlag });
  }
}

