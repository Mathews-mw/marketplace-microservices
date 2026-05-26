import { firstValueFrom } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { serviceConfig } from 'src/config/gateway.config';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

interface IUserSession {
  valid: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  } | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
  ) {}

  async validateJwtToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verify(token);
    } catch (error) {
      console.log('JWT validation error:', error);
      throw new UnauthorizedException('Invalid JWT token');
    }
  }

  async validateSessionToken(sessionToken: string): Promise<IUserSession> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<IUserSession>(
          `${serviceConfig.users.url}/sessions/validate/${sessionToken}`,
          { timeout: serviceConfig.users.timeout },
        ),
      );

      return data;
    } catch (error) {
      console.log('Session token validation error:', error);
      throw new UnauthorizedException('Invalid Session Token');
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${serviceConfig.users.url}/login`, loginDto, {
          timeout: serviceConfig.users.timeout,
        }),
      );

      return data;
    } catch (error) {
      console.log('Login error:', error);
      throw new UnauthorizedException('Invalid credentials!');
    }
  }

  async register(registerDto: RegisterDto) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${serviceConfig.users.url}/auth/register`,
          registerDto,
          {
            timeout: serviceConfig.users.timeout,
          },
        ),
      );

      return data;
    } catch (error) {
      console.log('Register error:', error);
      throw new UnauthorizedException('Registration failed');
    }
  }
}
