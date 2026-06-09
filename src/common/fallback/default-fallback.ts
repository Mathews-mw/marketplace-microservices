import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DefaultFallbackService {
  private readonly logger = new Logger(DefaultFallbackService.name);

  createDefaultFallback<T>(serviceName: string, defaultResponse: T): () => T {
    return (): T => {
      this.logger.warn(`Using default fallback for service: ${serviceName}`);
      return defaultResponse;
    };
  }

  createErrorFallback(serviceName: string, errorMessage: string): () => never {
    return () => {
      this.logger.warn(`Fallback error for ${serviceName}: ${errorMessage}`);
      throw new Error(`${serviceName} service unavailable: ${errorMessage}`);
    };
  }

  createEmptyArrayFallback<T>(serviceName: string): () => Array<T> {
    return (): Array<T> => {
      this.logger.warn(
        `Using empty array fallback for service: ${serviceName}`,
      );
      return [];
    };
  }

  createEmptyObjectFallback<T>(serviceName: string): () => T {
    return (): T => {
      this.logger.warn(
        `Using empty object fallback for service: ${serviceName}`,
      );
      return {} as T;
    };
  }
}
