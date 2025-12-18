import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { AnalysisResponseDto } from './dto/analysis-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('publication/:id')
  @UseGuards(JwtAuthGuard)
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
    @Req() req: any,
    @Query('force') force?: string,
  ): Promise<AnalysisResponseDto> {
    const forceFlag = (force ?? '').toString().toLowerCase() === 'true';
    return this.analysisService.analyzePublication(id, req.user?.userId ?? null, { force: forceFlag });
  }
}
