import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController.check', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('responde que a api está de pé', () => {
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
