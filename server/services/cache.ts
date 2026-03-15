/**
 * 인메모리 캐시 (TTL 기반)
 * 공공 API 호출 횟수를 줄이기 위해 사용
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const cache = new Cache();

// TTL 상수
export const TTL = {
  TRANSACTION: 1000 * 60 * 60 * 6,   // 실거래가: 6시간
  LISTING:     1000 * 60 * 30,         // 매물목록: 30분
  DISTRICT:    1000 * 60 * 60 * 24,   // 지역통계: 24시간
} as const;
