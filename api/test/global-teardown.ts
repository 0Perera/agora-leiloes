export default async function globalTeardown(): Promise<void> {
  await globalThis.postgres?.stop();
}
