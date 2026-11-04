import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../dto/jwt.payload.js';
import { ConfigService } from '@nestjs/config';
import { isUserRole, type AuthUser } from '../../common/types/auth-user.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'default-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!isUserRole(payload.role)) {
      throw new UnauthorizedException('Invalid token role');
    }

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}