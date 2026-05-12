import { describe, it, expect, vi } from 'vitest';
import {
  EventBusImpl,
  EventPool,
  createCascadeStepPool,
  createMatchLandedPool,
  createIntensityPool,
} from '../events';
import type { GameEvent, GameEventKind, EventOfKind } from '../events';

// ─── EventBusImpl 單元測試 ──────────────────────────────────

describe('EventBusImpl', () => {
  // ─── emit / on ────────────────────────────────────────

  describe('emit / on', () => {
    it('handler 收到正確的事件', () => {
      const bus = new EventBusImpl();
      const handler = vi.fn();
      bus.on('intensity.updated', handler);

      const event: GameEvent = { kind: 'intensity.updated', value: 0.5 };
      bus.emit(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('多個 handler 都被呼叫', () => {
      const bus = new EventBusImpl();
      const h1 = vi.fn();
      const h2 = vi.fn();
      const h3 = vi.fn();
      bus.on('cascade.stepEnded', h1);
      bus.on('cascade.stepEnded', h2);
      bus.on('cascade.stepEnded', h3);

      bus.emit({ kind: 'cascade.stepEnded', step: 1 });

      expect(h1).toHaveBeenCalledOnce();
      expect(h2).toHaveBeenCalledOnce();
      expect(h3).toHaveBeenCalledOnce();
    });

    it('不同 kind 的 handler 互不干擾', () => {
      const bus = new EventBusImpl();
      const intensityHandler = vi.fn();
      const reshuffleHandler = vi.fn();
      bus.on('intensity.updated', intensityHandler);
      bus.on('reshuffle.triggered', reshuffleHandler);

      bus.emit({ kind: 'intensity.updated', value: 0.8 });

      expect(intensityHandler).toHaveBeenCalledOnce();
      expect(reshuffleHandler).not.toHaveBeenCalled();
    });

    it('無 handler 時 emit 不拋錯', () => {
      const bus = new EventBusImpl();
      expect(() => {
        bus.emit({ kind: 'intensity.updated', value: 0 });
      }).not.toThrow();
    });

    it('emit 按註冊順序呼叫 handler', () => {
      const bus = new EventBusImpl();
      const order: number[] = [];
      bus.on('cascade.stepEnded', () => order.push(1));
      bus.on('cascade.stepEnded', () => order.push(2));
      bus.on('cascade.stepEnded', () => order.push(3));

      bus.emit({ kind: 'cascade.stepEnded', step: 0 });

      expect(order).toEqual([1, 2, 3]);
    });
  });

  // ─── unsubscribe ──────────────────────────────────────

  describe('unsubscribe', () => {
    it('unsubscribe 後不再收到事件', () => {
      const bus = new EventBusImpl();
      const handler = vi.fn();
      const unsub = bus.on('intensity.updated', handler);

      bus.emit({ kind: 'intensity.updated', value: 0.1 });
      expect(handler).toHaveBeenCalledOnce();

      unsub();
      bus.emit({ kind: 'intensity.updated', value: 0.2 });
      expect(handler).toHaveBeenCalledOnce(); // 仍然只有 1 次
    });

    it('重複 unsubscribe 不拋錯', () => {
      const bus = new EventBusImpl();
      const unsub = bus.on('intensity.updated', vi.fn());
      unsub();
      expect(() => unsub()).not.toThrow();
    });

    it('unsubscribe 不影響其他 handler', () => {
      const bus = new EventBusImpl();
      const h1 = vi.fn();
      const h2 = vi.fn();
      const unsub1 = bus.on('cascade.stepEnded', h1);
      bus.on('cascade.stepEnded', h2);

      unsub1();
      bus.emit({ kind: 'cascade.stepEnded', step: 0 });

      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledOnce();
    });
  });

  // ─── once ─────────────────────────────────────────────

  describe('once', () => {
    it('handler 只觸發一次', () => {
      const bus = new EventBusImpl();
      const handler = vi.fn();
      bus.once('intensity.updated', handler);

      bus.emit({ kind: 'intensity.updated', value: 0.3 });
      bus.emit({ kind: 'intensity.updated', value: 0.6 });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ kind: 'intensity.updated', value: 0.3 });
    });

    it('once 回傳的 unsub 可在觸發前取消', () => {
      const bus = new EventBusImpl();
      const handler = vi.fn();
      const unsub = bus.once('intensity.updated', handler);

      unsub();
      bus.emit({ kind: 'intensity.updated', value: 0.5 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('once handler 觸發後 unsub 不拋錯', () => {
      const bus = new EventBusImpl();
      const handler = vi.fn();
      const unsub = bus.once('intensity.updated', handler);

      bus.emit({ kind: 'intensity.updated', value: 0.5 });
      expect(() => unsub()).not.toThrow();
    });
  });

  // ─── emit 期間安全性 ─────────────────────────────────

  describe('emit 期間安全性', () => {
    it('handler 中 unsub 不影響當前 emit 迭代', () => {
      const bus = new EventBusImpl();
      const calls: string[] = [];
      const unsub2Ref: [(() => void) | undefined] = [undefined];

      bus.on('cascade.stepEnded', () => {
        calls.push('h1');
        unsub2Ref[0]?.(); // 在 h1 中移除 h2
      });
      unsub2Ref[0] = bus.on('cascade.stepEnded', () => {
        calls.push('h2');
      });
      bus.on('cascade.stepEnded', () => {
        calls.push('h3');
      });

      bus.emit({ kind: 'cascade.stepEnded', step: 0 });

      // 快照迭代：h2 仍然在本次 emit 中被呼叫
      expect(calls).toEqual(['h1', 'h2', 'h3']);

      // 但下次 emit 時 h2 已被移除
      calls.length = 0;
      bus.emit({ kind: 'cascade.stepEnded', step: 1 });
      expect(calls).toEqual(['h1', 'h3']);
    });

    it('handler 中新增的 handler 不在當前 emit 中觸發', () => {
      const bus = new EventBusImpl();
      const lateHandler = vi.fn();

      bus.on('cascade.stepEnded', () => {
        bus.on('cascade.stepEnded', lateHandler);
      });

      bus.emit({ kind: 'cascade.stepEnded', step: 0 });
      // 快照迭代：新增的 handler 不在本次 emit 中觸發
      expect(lateHandler).not.toHaveBeenCalled();

      // 下次 emit 時才觸發
      bus.emit({ kind: 'cascade.stepEnded', step: 1 });
      expect(lateHandler).toHaveBeenCalledOnce();
    });
  });

  // ─── off / clear / listenerCount ─────────────────────

  describe('off / clear / listenerCount', () => {
    it('off 移除指定 kind 的所有 handler', () => {
      const bus = new EventBusImpl();
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on('intensity.updated', h1);
      bus.on('intensity.updated', h2);

      bus.off('intensity.updated');
      bus.emit({ kind: 'intensity.updated', value: 0 });

      expect(h1).not.toHaveBeenCalled();
      expect(h2).not.toHaveBeenCalled();
    });

    it('clear 移除所有 handler', () => {
      const bus = new EventBusImpl();
      bus.on('intensity.updated', vi.fn());
      bus.on('cascade.stepEnded', vi.fn());
      bus.on('reshuffle.triggered', vi.fn());

      bus.clear();

      expect(bus.listenerCount('intensity.updated')).toBe(0);
      expect(bus.listenerCount('cascade.stepEnded')).toBe(0);
      expect(bus.listenerCount('reshuffle.triggered')).toBe(0);
    });

    it('listenerCount 回傳正確數量', () => {
      const bus = new EventBusImpl();
      expect(bus.listenerCount('intensity.updated')).toBe(0);

      const unsub1 = bus.on('intensity.updated', vi.fn());
      bus.on('intensity.updated', vi.fn());
      expect(bus.listenerCount('intensity.updated')).toBe(2);

      unsub1();
      expect(bus.listenerCount('intensity.updated')).toBe(1);
    });
  });

  // ─── 型別安全驗證 ────────────────────────────────────

  describe('型別安全', () => {
    it('所有 GameEvent kind 都可以 emit 與 on', () => {
      const bus = new EventBusImpl();
      const kinds: GameEventKind[] = [
        'app.loaded',
        'level.started',
        'command.applied',
        'swap.invalid',
        'match.landed',
        'cascade.stepBegan',
        'cascade.stepEnded',
        'chain.escalated',
        'special.spawned',
        'special.activated',
        'combo.triggered',
        'objective.progressed',
        'level.resolved',
        'reshuffle.triggered',
        'hint.shown',
        'intensity.updated',
        'visibility.resumed',
      ];

      // 驗證所有 kind 都可以註冊 handler
      for (const kind of kinds) {
        const handler = vi.fn();
        const unsub = bus.on(kind, handler);
        expect(typeof unsub).toBe('function');
        unsub();
      }

      expect(kinds).toHaveLength(17);
    });

    it('swap.invalid 事件攜帶正確的 CellPos 資料', () => {
      const bus = new EventBusImpl();
      let received: EventOfKind<'swap.invalid'> | null = null;

      bus.on('swap.invalid', (e) => {
        received = e;
      });

      bus.emit({ kind: 'swap.invalid', from: [1, 2], to: [1, 3] });

      expect(received).not.toBeNull();
      expect(received!.from).toEqual([1, 2]);
      expect(received!.to).toEqual([1, 3]);
    });

    it('match.landed 事件攜帶 matches 與 chain', () => {
      const bus = new EventBusImpl();
      let received: EventOfKind<'match.landed'> | null = null;

      bus.on('match.landed', (e) => {
        received = e;
      });

      bus.emit({
        kind: 'match.landed',
        matches: [
          {
            cells: [[0, 0], [1, 0], [2, 0]],
            shape: 'straight3',
            colour: 'R',
          },
        ],
        chain: 2,
      });

      expect(received).not.toBeNull();
      expect(received!.matches).toHaveLength(1);
      expect(received!.chain).toBe(2);
    });

    it('visibility.resumed 事件攜帶 awayMs', () => {
      const bus = new EventBusImpl();
      let awayMs = -1;

      bus.on('visibility.resumed', (e) => {
        awayMs = e.awayMs;
      });

      bus.emit({ kind: 'visibility.resumed', awayMs: 5000 });
      expect(awayMs).toBe(5000);
    });
  });
});

// ─── EventPool 單元測試 ─────────────────────────────────────

describe('EventPool', () => {
  function createTestPool(initialSize = 4, cap = 8) {
    return new EventPool<{ kind: string; value: number }>({
      factory: () => ({ kind: 'test', value: 0 }),
      reset: (obj) => {
        obj.value = 0;
      },
      initialSize,
      cap,
    });
  }

  it('初始化時建立指定數量的物件', () => {
    const pool = createTestPool(4, 8);
    expect(pool.available).toBe(4);
  });

  it('acquire 從池中取得物件', () => {
    const pool = createTestPool(4, 8);
    const obj = pool.acquire();
    expect(obj).toBeDefined();
    expect(obj.kind).toBe('test');
    expect(pool.available).toBe(3);
  });

  it('池空時 acquire 建立新物件', () => {
    const pool = createTestPool(1, 8);
    pool.acquire(); // 取出唯一一個
    expect(pool.available).toBe(0);

    const obj = pool.acquire(); // 池空，建立新的
    expect(obj).toBeDefined();
    expect(obj.kind).toBe('test');
  });

  it('release 歸還物件至池中', () => {
    const pool = createTestPool(2, 8);
    const obj = pool.acquire();
    obj.value = 42;

    pool.release(obj);
    expect(pool.available).toBe(2); // 原本 2，取出 1 變 1，歸還變 2

    // 歸還後 value 被 reset
    const reused = pool.acquire();
    expect(reused.value).toBe(0);
  });

  it('超過 cap 時 release 丟棄物件', () => {
    const pool = createTestPool(0, 2);
    const obj1 = pool.acquire();
    const obj2 = pool.acquire();
    const obj3 = pool.acquire();

    pool.release(obj1);
    pool.release(obj2);
    expect(pool.available).toBe(2); // 達到 cap

    pool.release(obj3); // 超過 cap，丟棄
    expect(pool.available).toBe(2);
  });

  it('capacity 回傳正確的上限', () => {
    const pool = createTestPool(4, 16);
    expect(pool.capacity).toBe(16);
  });

  it('acquire-release 循環不洩漏', () => {
    const pool = createTestPool(4, 8);
    for (let i = 0; i < 100; i++) {
      const obj = pool.acquire();
      obj.value = i;
      pool.release(obj);
    }
    // 池中物件數量不超過 cap
    expect(pool.available).toBeLessThanOrEqual(pool.capacity);
  });
});

// ─── 預建事件池測試 ─────────────────────────────────────────

describe('預建事件池', () => {
  it('createCascadeStepPool 建立正確的池', () => {
    const pool = createCascadeStepPool(4, 16);
    const obj = pool.acquire();
    expect(obj.kind).toBe('cascade.stepBegan');
    expect(obj.step).toBe(0);
    expect(obj.drops).toEqual([]);

    // 修改後歸還，確認 reset
    obj.step = 5;
    obj.drops = [{ column: 0, distance: 3 }];
    pool.release(obj);

    const reused = pool.acquire();
    expect(reused.step).toBe(0);
    expect(reused.drops).toEqual([]);
  });

  it('createMatchLandedPool 建立正確的池', () => {
    const pool = createMatchLandedPool(4, 16);
    const obj = pool.acquire();
    expect(obj.kind).toBe('match.landed');
    expect(obj.matches).toEqual([]);
    expect(obj.chain).toBe(0);

    obj.chain = 3;
    obj.matches = [{ cells: [[0, 0], [1, 0], [2, 0]], shape: 'straight3', colour: 'R' }];
    pool.release(obj);

    const reused = pool.acquire();
    expect(reused.chain).toBe(0);
    expect(reused.matches).toEqual([]);
  });

  it('createIntensityPool 建立正確的池', () => {
    const pool = createIntensityPool(2, 8);
    const obj = pool.acquire();
    expect(obj.kind).toBe('intensity.updated');
    expect(obj.value).toBe(0);

    obj.value = 0.75;
    pool.release(obj);

    const reused = pool.acquire();
    expect(reused.value).toBe(0);
  });

  it('池化事件可直接 emit 至 EventBus', () => {
    const bus = new EventBusImpl();
    const pool = createIntensityPool(2, 8);
    const handler = vi.fn();

    bus.on('intensity.updated', handler);

    const event = pool.acquire();
    event.value = 0.42;
    bus.emit(event);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'intensity.updated', value: 0.42 }),
    );

    pool.release(event);
  });
});
