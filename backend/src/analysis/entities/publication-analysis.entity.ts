import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Publication } from '../../publications/entities/publication.entity';
import { AnalysisResponseDto } from '../dto/analysis-response.dto';

@Entity({ name: 'publication_analysis' })
export class PublicationAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Publication, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'publication_id' })
  publication!: Publication;

  @Column({ name: 'result', type: 'jsonb' })
  result!: AnalysisResponseDto;

  @Column({ name: 'model', type: 'varchar', nullable: true })
  model?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
