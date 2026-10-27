import { Repository } from 'typeorm';
import { DashboardService } from './dashboard.service';
import { Lot } from './lot.entity';

const NOW = new Date('2026-10-26T12:00:00Z');

function makeService(row: unknown) {
  const builder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(row),
  };
  const lots = { createQueryBuilder: () => builder };
  return new DashboardService(
    { now: () => NOW },
    lots as unknown as Repository<Lot>,
  );
}

describe('DashboardService.summary', () => {
  it('leiloeiro sem lotes recebe zeros e próximo início nulo', async () => {
    const service = makeService({
      liveCount: 0,
      currentBidTotal: null,
      scheduledCount: 0,
      nextStartsAt: null,
      endedCount: 0,
      withoutBids: 0,
      received: null,
    });

    expect(await service.summary(1)).toEqual({
      live: { count: 0, currentBidTotal: 0 },
      scheduled: { count: 0, nextStartsAt: null },
      ended: { count: 0, withoutBids: 0 },
      received: 0,
    });
  });
});
