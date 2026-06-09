import { Injectable, Logger } from '@nestjs/common';
import { IHealthStatus, type IServiceHealth } from './health-check.interface';
import type { HttpService } from '@nestjs/axios';
import type { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { serviceConfig } from 'src/config/gateway.config';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly healthCache = new Map<string, IServiceHealth>();

  constructor(
    private readonly httpService: HttpService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  async checkServiceHealth(
    serviceName: keyof typeof serviceConfig,
  ): Promise<IServiceHealth> {
    const service = serviceConfig[serviceName];
    const startTime = Date.now();

    try {
      await this.circuitBreakerService.executeWithCircuitBreaker(
        async () => {
          const response = await firstValueFrom(
            this.httpService
              .get(`${service.url}/health`, {
                timeout: service.timeout,
              })
              .pipe(timeout(service.timeout)),
          );

          return response.status;
        },
        `health-${serviceName}`,
        {
          failureThreshold: 5,
          timeout: 60000,
          resetTimeout: 30000,
        },
        () => {
          throw new Error('Circuit breaker fallback');
        },
      );

      const responseTime = Date.now() - startTime;
      const serviceHealth: IServiceHealth = {
        name: serviceName,
        url: service.url,
        status: IHealthStatus.HEALTHY,
        responseTime,
        lastCheck: new Date(),
      };

      this.healthCache.set(serviceName, serviceHealth);

      return serviceHealth;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const serviceHealth: IServiceHealth = {
        name: serviceName,
        url: service.url,
        status: IHealthStatus.UNHEALTHY,
        responseTime,
        lastCheck: new Date(),
        error: error.message,
      };
      this.healthCache.set(serviceName, serviceHealth);
      this.logger.error(
        `Health check failed for ${serviceName}`,
        error.message,
      );

      return serviceHealth;
    }
  }

  async checkAllServices(): Promise<IServiceHealth[]> {
    const services: (keyof typeof serviceConfig)[] = [
      'users',
      'products',
      'checkout',
      'payments',
    ];

    const healthChecks = await Promise.allSettled(
      services.map((serviceName) => this.checkServiceHealth(serviceName)),
    );

    return healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: services[index],
          url: serviceConfig[services[index]].url,
          status: IHealthStatus.UNHEALTHY,
          responseTime: 0,
          lastCheck: new Date(),
          error: result.reason?.message || 'Unknown error',
        };
      }
    });
  }

  getCachedHealth(serviceName: string): IServiceHealth | undefined {
    return this.healthCache.get(serviceName);
  }

  getAllCachedHealth(): IServiceHealth[] {
    return Array.from(this.healthCache.values());
  }
}
