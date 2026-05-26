import { Injectable, Logger } from '@nestjs/common';
import {
  CircuitBreakerState,
  ICircuitBreakerOptions,
  ICircuitBreakerState,
} from './circuit-breaker.interface';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger('CircuitBreaker');
  private readonly circuits = new Map<string, ICircuitBreakerState>();
  private readonly defaultOptions = {
    failureThreshold: 5,
    timeout: 60000,
    resetTimeout: 30000,
  };

  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    key: string,
    options: ICircuitBreakerOptions = this.defaultOptions,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    const circuit = this.getOrCreateCircuit(key, config);

    if (circuit.state === CircuitBreakerState.OPEN) {
      if (Date.now() < circuit.nextAttemptTime) {
        this.logger.warn(`Circuit Breaker OPEN for ${key}, using fallback`);

        if (fallback) {
          return await fallback();
        }

        throw new Error(`Circuit Breaker OPEN for ${key}`);
      } else {
        circuit.state = CircuitBreakerState.HALF_OPEN;
        this.logger.warn(
          `Circuit Breaker HALF_OPEN for ${key}, using fallback`,
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess(circuit, key);

      return result;
    } catch (error: unknown) {
      this.onFailure(circuit, key, config);

      if (error instanceof Error) {
        this.logger.error(`Operation failed for ${key}: ${error.message}`);
      }

      if (fallback) {
        this.logger.log(`Executing fallback for ${key}`);
        return await fallback();
      }

      throw error;
    }
  }

  private getOrCreateCircuit(
    key: string,
    options: ICircuitBreakerOptions,
  ): ICircuitBreakerState {
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        state: CircuitBreakerState.CLOSE,
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: Date.now() + options.timeout,
      });
    }

    return this.circuits.get(key)!;
  }

  private onSuccess(circuit: ICircuitBreakerState, key: string) {
    circuit.failureCount = 0;
    circuit.state = CircuitBreakerState.CLOSE;
    this.logger.debug(`Circuit breaker SUCCESS for ${key}, state: CLOSED`);
  }

  private onFailure(
    circuit: ICircuitBreakerState,
    key: string,
    options: ICircuitBreakerOptions,
  ) {
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    if (circuit.failureCount >= options.failureThreshold) {
      circuit.state = CircuitBreakerState.OPEN;
      circuit.nextAttemptTime = Date.now() + options.resetTimeout;
      this.logger.warn(
        `Circuit breaker OPENED for ${key} after ${circuit.failureCount} failures`,
      );
    }
  }

  getCircuitState(key: string): ICircuitBreakerState | undefined {
    return this.circuits.get(key);
  }

  getAllCircuits(): Map<string, ICircuitBreakerState> {
    return new Map(this.circuits);
  }

  resetCircuit(key: string): void {
    this.circuits.delete(key);
    this.logger.log(`Circuit breaker RESET for ${key}`);
  }
}
