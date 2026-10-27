import { MigrationInterface, QueryRunner } from 'typeorm';

export class LotsCurrentBid1793064527994 implements MigrationInterface {
  name = 'LotsCurrentBid1793064527994';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "lots_current_bid" ON "lots" ("current_bid") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."lots_current_bid"`);
  }
}
