import { Injectable, Inject } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const testKey = 'health-check-test';
      const testValue = 'ok';

      await this.cacheManager.set(testKey, testValue, 10);
      const retrievedValue = await this.cacheManager.get(testKey);

      if (retrievedValue === testValue) {
        return this.getStatus(key, true);
      } else {
        throw new Error('Redis test value mismatch');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, { error: errorMessage }),
      );
    }
  }
}
