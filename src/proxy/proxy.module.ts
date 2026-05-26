import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { ProxyService } from './service/proxy.service';
import { CircuitBreakerModule } from 'src/common/circuit-breaker/circuit-breaker.module';

@Module({
  imports: [HttpModule, CircuitBreakerModule],
  providers: [ProxyService],
  exports: [ProxyService],
})
export class ProxyModule {}
