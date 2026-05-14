import { Injectable } from '@nestjs/common';
import {
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerRequest,
} from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return Promise.resolve(`${req.ip}-${req.headers['user-agent']}`);
  }

  protected async handleRequest(
    throttleRequestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context, limit, ttl } = throttleRequestProps;

    const { req, res } = this.getRequestResponse(context);

    const tracker = await this.getTracker(req);

    const throttles = this.reflector.get('throttle', context.getHandler());
    const throttleName = throttles ? Object.keys(throttles)[0] : 'default';

    const key = this.generateKey(context, tracker, throttleName);

    const totalHistsResult = await this.storageService.increment(
      key,
      ttl,
      limit,
      1,
      throttleName,
    );

    if (totalHistsResult.totalHits > limit) {
      res.setHeader('Retry-After', Math.round(ttl / 1000));
      throw new ThrottlerException();
    }

    res.setHeader(`${this.headerPrefix}-Limit`, limit); // Número máximo de requisições permitidas dentro do período de tempo
    res.setHeader(
      `${this.headerPrefix}-Remaining`,
      limit - totalHistsResult.totalHits,
    ); // Número de requisições restantes antes de atingir o limite
    res.setHeader(`${this.headerPrefix}-Reset`, Math.round(ttl / 1000)); // Tempo em segundos até que o contador de requisições seja resetado

    return true;
  }
}
