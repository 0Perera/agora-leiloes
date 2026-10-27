import { MigrationInterface, QueryRunner } from 'typeorm';

export class BidsUserId1793123206690 implements MigrationInterface {
  name = 'BidsUserId1793123206690';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "bids_user_id" ON "bids" ("user_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."bids_user_id"`);
  }
}
