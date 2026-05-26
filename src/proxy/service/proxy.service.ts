import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

import { serviceConfig } from '../../config/gateway.config';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly httpService: HttpService) {}

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

    try {
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

      return response;
    } catch (error) {
      this.logger.error(
        `Error proxying [${method}] request to ${serviceName}": ${url}`,
      );

      throw error;
    }
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
}
