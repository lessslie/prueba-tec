import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsPausedLocallyToPublications1735266000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'publications',
      new TableColumn({
        name: 'is_paused_locally',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('publications', 'is_paused_locally');
  }
}
