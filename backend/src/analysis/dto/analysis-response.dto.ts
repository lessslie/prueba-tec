import { ApiProperty } from '@nestjs/swagger';

export class AnalysisResponseDto {
  @ApiProperty({ example: 'Improve the title by including brand + model + key specs.' })
  titleRecommendations!: string;

  @ApiProperty({ example: 'Clarify warranty and storage type; add delivery time info.' })
  descriptionIssues!: string;

  @ApiProperty({ example: 'Consider bundle with mousepad; highlight financing.' })
  conversionOpportunities!: string;

  @ApiProperty({ example: 'Listing is paused; low stock (1 unit) may hurt ranking.' })
  commercialRisks!: string;
}


