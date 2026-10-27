import { ConfigService } from '@nestjs/config';
import { DomainException } from '../common/domain.exception';
import type { Env } from '../config/env.validation';
import { ClevelandClient, MAX_IMAGE_BYTES } from './cleveland.client';

const IMAGE_URL = 'https://openaccess-cdn.clevelandart.org/x.jpg';

function makeClient(): ClevelandClient {
  const config = { get: () => 'https://api.example' };
  return new ClevelandClient(config as unknown as ConfigService<Env, true>);
}

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
}

function mockFetch(response: Response | Error): void {
  jest
    .spyOn(global, 'fetch')
    .mockImplementation(() =>
      response instanceof Error
        ? Promise.reject(response)
        : Promise.resolve(response),
    );
}

describe('ClevelandClient.download', () => {
  afterEach(() => jest.restoreAllMocks());

  it('recusa content-type que não é imagem', async () => {
    mockFetch(
      new Response('<html></html>', {
        headers: { 'content-type': 'text/html' },
      }),
    );

    await expect(makeClient().download(IMAGE_URL)).rejects.toThrow(
      new DomainException('IMAGE_DOWNLOAD_FAILED'),
    );
  });

  it('recusa imagem acima de 5 MB mesmo sem content-length', async () => {
    const half = new Uint8Array(MAX_IMAGE_BYTES / 2 + 1);
    mockFetch(
      new Response(streamOf([half, half]), {
        headers: { 'content-type': 'image/jpeg' },
      }),
    );

    await expect(makeClient().download(IMAGE_URL)).rejects.toThrow(
      new DomainException('IMAGE_DOWNLOAD_FAILED'),
    );
  });

  it('converte falha de rede em IMAGE_DOWNLOAD_FAILED', async () => {
    mockFetch(new TypeError('fetch failed'));

    await expect(makeClient().download(IMAGE_URL)).rejects.toThrow(
      new DomainException('IMAGE_DOWNLOAD_FAILED'),
    );
  });
});
