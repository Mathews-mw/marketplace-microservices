export enum IHealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
}

export interface IServiceHealth {
  name: string;
  url: string;
  status: IHealthStatus;
  responseTime: number;
  lastCheck: Date;
  error?: Error;
}
