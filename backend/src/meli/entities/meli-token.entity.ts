import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'meli_tokens' })
export class MeliToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'access_token' })
  accessToken!: string;

  @Column({ name: 'refresh_token', type: 'varchar', nullable: true })
  refreshToken!: string;

  @Column({ name: 'token_type', type: 'varchar', nullable: true })
  tokenType!: string;

  @Column({ type: 'varchar', nullable: true })
  scope!: string | null;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId!: number | null;

  // Relación con usuario de la app (UUID)
  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
