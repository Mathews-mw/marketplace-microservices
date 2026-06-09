/* eslint-disable @typescript-eslint/no-unsafe-return */
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

import { serviceConfig } from '../../config/gateway.config';
import { CircuitBreakerService } from 'src/common/circuit-breaker/circuit-breaker.service';
import { CacheFallbackService } from 'src/common/fallback/cache-fallback';
import { DefaultFallbackService } from 'src/common/fallback/default-fallback';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly cacheFallbackService: CacheFallbackService,
    private readonly defaultFallbackService: DefaultFallbackService,
  ) {}

  async proxyRequest(
    serviceName: keyof typeof serviceConfig,
    method: HttpMethod,
    path: string,
    data?: unknown,
    headers?: Record<string, string>,
    userInfo?: { id: string; email: string; role: string },
  ): Promise<AxiosResponse<unknown>> {
    const service = serviceConfig[serviceName];
    const url = `${service.url}/${path}`;

    this.logger.log(`Proxying request to ${serviceName}: [${method}] ${url}`);

    const fallback = this.createServiceFallback(serviceName, method, path);

    return this.circuitBreaker.executeWithCircuitBreaker(
      async () => {
        const enhancedHeaders: Record<string, string> = {
          ...headers,
          ...(userInfo?.id ? { 'x-user-id': userInfo.id } : {}),
          ...(userInfo?.email ? { 'x-user-email': userInfo.email } : {}),
          ...(userInfo?.role ? { 'x-user-role': userInfo.role } : {}),
        };

        const response = await firstValueFrom(
          this.httpService.request({
            method: method.toLocaleLowerCase(),
            url,
            data,
            headers: enhancedHeaders,
            timeout: service.timeout,
          }),
        );

        if (method.toLocaleLowerCase() === 'get') {
          this.cacheFallbackService.setCachedData(
            `${serviceName}-${path}`,
            response.data,
          );
        }

        return response.data;
      },
      `proxy-${serviceName}`,
      { failureThreshold: 3, timeout: 30000, resetTimeout: 30000 },
      fallback,
    );
  }

  async getServiceHealth(serviceName: keyof typeof serviceConfig) {
    try {
      const service = serviceConfig[serviceName];

      const response = await firstValueFrom(
        this.httpService.get<Record<string, unknown>>(`${service.url}/health`, {
          timeout: 3000,
        }),
      );

      return { status: 'healthy', data: response.data };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return { status: 'unhealthy', error: errorMessage };
    }
  }

  createServiceFallback(serviceName: string, method: string, path: string) {
    switch (serviceName) {
      case 'users':
        if (path.includes('/auth/login')) {
          return this.defaultFallbackService.createErrorFallback(
            'users',
            'Authentication service unavailable',
          );
        }

        return this.defaultFallbackService.createErrorFallback(
          'users',
          'User service unavailable',
        );
      case 'products':
        if (method.toLowerCase() === 'get') {
          return this.cacheFallbackService.createCacheFallback(
            `products-${path}`,
            { products: [], total: 0, page: 1, limit: 10 },
          );
        }

        return this.defaultFallbackService.createErrorFallback(
          'products',
          'Product service unavailable',
        );
      case 'checkout':
      case 'payments':
        return this.defaultFallbackService.createErrorFallback(
          serviceName,
          `${serviceName} service unavailable`,
        );
      default:
        return this.defaultFallbackService.createErrorFallback(
          serviceName,
          'Service unavailable',
        );
    }
  }
}
