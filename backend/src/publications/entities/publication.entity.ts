import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PublicationDescription } from './publication-description.entity';

@Entity({ name: 'publications' })
export class Publication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'meli_item_id', unique: true })
  meliItemId!: string;

  @Column({ name: 'permalink', type: 'varchar', nullable: true })
  permalink!: string | null;

  @Column()
  title!: string;

  @Column('numeric')
  price!: number;

  @Column()
  status!: string;

  @Column({ name: 'available_quantity', type: 'int' })
  availableQuantity!: number;

  @Column({ name: 'sold_quantity', type: 'int' })
  soldQuantity!: number;

  @Column()
  categoryId!: string;

  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId!: string | null;

  @OneToMany(
    () => PublicationDescription,
    (description) => description.publication,
    { cascade: true },
  )
  descriptions!: PublicationDescription[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
