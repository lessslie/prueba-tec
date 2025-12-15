import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Publication } from './publication.entity';

@Entity({ name: 'publication_descriptions' })
export class PublicationDescription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Publication, (publication) => publication.descriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'publication_id' })
  publication!: Publication;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}


