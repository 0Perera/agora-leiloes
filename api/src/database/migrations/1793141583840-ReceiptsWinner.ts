import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReceiptsWinner1793141583840 implements MigrationInterface {
  name = 'ReceiptsWinner1793141583840';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "receipts" ADD "winner_user_id" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" ADD CONSTRAINT "FK_efb010fc59cf188df187327150c" FOREIGN KEY ("winner_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "receipts" DROP CONSTRAINT "FK_efb010fc59cf188df187327150c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" DROP COLUMN "winner_user_id"`,
    );
  }
}
