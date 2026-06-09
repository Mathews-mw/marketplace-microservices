import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { ProxyService } from './service/proxy.service';
import { FallbackModule } from 'src/common/fallback/fallback.module';
import { CircuitBreakerModule } from 'src/common/circuit-breaker/circuit-breaker.module';

@Module({
  imports: [HttpModule, CircuitBreakerModule, FallbackModule],
  providers: [ProxyService],
  exports: [ProxyService],
})
export class ProxyModule {}
