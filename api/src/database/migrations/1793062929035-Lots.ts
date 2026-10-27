import { MigrationInterface, QueryRunner } from 'typeorm';

export class Lots1793062929035 implements MigrationInterface {
  name = 'Lots1793062929035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "lots" ("id" SERIAL NOT NULL, "number" SERIAL NOT NULL, "auctioneer_id" integer NOT NULL, "artwork_id" integer NOT NULL, "accession_number" character varying NOT NULL, "title" character varying NOT NULL, "artist" character varying NOT NULL, "date" character varying NOT NULL, "type" character varying NOT NULL, "technique" character varying NOT NULL, "measurements" character varying NOT NULL, "description" text, "department" character varying NOT NULL, "starting_bid" integer NOT NULL, "increment" integer NOT NULL, "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL, "cancelled_at" TIMESTAMP WITH TIME ZONE, "settled_at" TIMESTAMP WITH TIME ZONE, "current_bid" integer, "bid_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ed86d435d5054ffa1857780cd04" UNIQUE ("number"), CONSTRAINT "lots_bid_count" CHECK ("bid_count" >= 0), CONSTRAINT "lots_amounts" CHECK ("starting_bid" > 0 AND "increment" > 0 AND ("current_bid" IS NULL OR "current_bid" > 0)), CONSTRAINT "lots_period" CHECK ("ends_at" > "starts_at"), CONSTRAINT "PK_2bb990a4015865cb1daa1d22fd9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "lots_auctioneer_id" ON "lots" ("auctioneer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "lots_artwork_id" ON "lots" ("artwork_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "lots_starts_at" ON "lots" ("starts_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "lots_ends_at" ON "lots" ("ends_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "lot_images" ("lot_id" integer NOT NULL, "content_type" character varying NOT NULL, "bytes" bytea NOT NULL, CONSTRAINT "PK_7f073cebd6988ef4baff1033236" PRIMARY KEY ("lot_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "lots" ADD CONSTRAINT "FK_4867abb02e6719f8558aec62076" FOREIGN KEY ("auctioneer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lot_images" ADD CONSTRAINT "FK_7f073cebd6988ef4baff1033236" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lot_images" DROP CONSTRAINT "FK_7f073cebd6988ef4baff1033236"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lots" DROP CONSTRAINT "FK_4867abb02e6719f8558aec62076"`,
    );
    await queryRunner.query(`DROP TABLE "lot_images"`);
    await queryRunner.query(`DROP INDEX "public"."lots_ends_at"`);
    await queryRunner.query(`DROP INDEX "public"."lots_starts_at"`);
    await queryRunner.query(`DROP INDEX "public"."lots_artwork_id"`);
    await queryRunner.query(`DROP INDEX "public"."lots_auctioneer_id"`);
    await queryRunner.query(`DROP TABLE "lots"`);
  }
}
