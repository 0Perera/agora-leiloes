import { Injectable, MessageEvent } from '@nestjs/common';
import { interval, map, merge, Observable } from 'rxjs';
import { BidEventDto, toBidEvent } from './dto/bid-event.dto';
import { SettledEventDto, toSettledEvent } from './dto/settled-event.dto';

export const HEARTBEAT_MS = 25_000;

type Subscriber = (event: MessageEvent) => void;

// Em memória, numa instância só: com mais de uma réplica, cada uma veria só os próprios lances.
@Injectable()
export class LotEventsService {
  private readonly subscribers = new Map<number, Set<Subscriber>>();

  publish(lotId: number, bid: BidEventDto): void {
    this.send(lotId, { type: 'bid', data: toBidEvent(bid) });
  }

  settled(lotId: number, result: SettledEventDto): void {
    this.send(lotId, { type: 'settled', data: toSettledEvent(result) });
  }

  stream(lotId: number): Observable<MessageEvent> {
    const bids = new Observable<MessageEvent>((subscriber) => {
      const send: Subscriber = (event) => subscriber.next(event);
      this.add(lotId, send);
      return () => this.remove(lotId, send);
    });
    // Comentário SSE: mantém a conexão viva em proxies sem disparar evento no cliente.
    const heartbeat = interval(HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ comment: 'heartbeat' })),
    );
    return merge(bids, heartbeat);
  }

  listeners(lotId: number): number {
    return this.subscribers.get(lotId)?.size ?? 0;
  }

  private send(lotId: number, event: MessageEvent): void {
    this.subscribers.get(lotId)?.forEach((send) => send(event));
  }

  private add(lotId: number, send: Subscriber): void {
    const set = this.subscribers.get(lotId) ?? new Set<Subscriber>();
    set.add(send);
    this.subscribers.set(lotId, set);
  }

  private remove(lotId: number, send: Subscriber): void {
    const set = this.subscribers.get(lotId);
    set?.delete(send);
    if (set?.size === 0) this.subscribers.delete(lotId);
  }
}
