export enum CircuitBreakerState {
  CLOSE = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface ICircuitBreakerOptions {
  failureThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export interface ICircuitBreakerState {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export interface ICircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  fromCache?: boolean;
}
