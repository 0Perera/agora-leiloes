import { MigrationInterface, QueryRunner } from 'typeorm';

export class Bids1793117114429 implements MigrationInterface {
  name = 'Bids1793117114429';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "bids" ("id" SERIAL NOT NULL, "lot_id" integer NOT NULL, "seq" integer NOT NULL, "user_id" integer NOT NULL, "amount" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "prev_hash" character varying(64) NOT NULL, "hash" character varying(64) NOT NULL, CONSTRAINT "bids_lot_seq" UNIQUE ("lot_id", "seq"), CONSTRAINT "bids_values" CHECK ("seq" >= 1 AND "amount" > 0), CONSTRAINT "PK_7950d066d322aab3a488ac39fe5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "lots" ADD "seal" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bids" ADD CONSTRAINT "FK_45780bd8ce7162c644f6aa5c53a" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bids" ADD CONSTRAINT "FK_cd7b0cdcb890ad457b676c0dfe8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bids" DROP CONSTRAINT "FK_cd7b0cdcb890ad457b676c0dfe8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bids" DROP CONSTRAINT "FK_45780bd8ce7162c644f6aa5c53a"`,
    );
    await queryRunner.query(`ALTER TABLE "lots" DROP COLUMN "seal"`);
    await queryRunner.query(`DROP TABLE "bids"`);
  }
}
