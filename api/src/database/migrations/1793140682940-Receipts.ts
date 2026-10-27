import { MigrationInterface, QueryRunner } from 'typeorm';

export class Receipts1793140682940 implements MigrationInterface {
  name = 'Receipts1793140682940';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "receipts" ("id" SERIAL NOT NULL, "lot_id" integer NOT NULL, "token" character varying(43) NOT NULL, "alias" character varying NOT NULL, "amount" integer NOT NULL, "final_hash" character varying(64) NOT NULL, "settled_at" TIMESTAMP WITH TIME ZONE NOT NULL, "signature" character varying(64) NOT NULL, CONSTRAINT "receipts_token" UNIQUE ("token"), CONSTRAINT "receipts_lot_id" UNIQUE ("lot_id"), CONSTRAINT "receipts_amount" CHECK ("amount" > 0), CONSTRAINT "PK_5e8182d7c29e023da6e1ff33bfe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" ADD CONSTRAINT "FK_b2705c0c7899b5d2e6252cd5f8a" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "receipts" DROP CONSTRAINT "FK_b2705c0c7899b5d2e6252cd5f8a"`,
    );
    await queryRunner.query(`DROP TABLE "receipts"`);
  }
}
