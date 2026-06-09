export interface IFallbackStrategy {
  execute(): Promise<T>;
}

export interface IFallbackOptions {
  useCache?: boolean;
  cacheTimeout?: number;
  defaultResponse?: any;
  retryCount?: number;
  retryDelay?: number;
}
