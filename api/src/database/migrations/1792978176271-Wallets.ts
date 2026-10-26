import { MigrationInterface, QueryRunner } from 'typeorm';

export class Wallets1792978176271 implements MigrationInterface {
  name = 'Wallets1792978176271';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "wallets" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "balance" integer NOT NULL DEFAULT '0', "committed" integer NOT NULL DEFAULT '0', CONSTRAINT "REL_92558c08091598f7a4439586cd" UNIQUE ("user_id"), CONSTRAINT "wallets_balance" CHECK ("balance" >= "committed" AND "committed" >= 0), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "FK_92558c08091598f7a4439586cda" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "wallets" ("user_id") SELECT "id" FROM "users"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "FK_92558c08091598f7a4439586cda"`,
    );
    await queryRunner.query(`DROP TABLE "wallets"`);
  }
}
