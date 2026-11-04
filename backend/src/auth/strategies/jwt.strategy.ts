import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../dto/jwt.payload.js';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service.js';
import { isUserRole, type AuthUser } from '../../common/types/auth-user.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private readonly usersService: UsersService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (typeof payload?.sub !== 'string' || payload.sub.length === 0) {
      throw new UnauthorizedException('Invalid session');
    }

    if (!isUserRole(payload.role)) {
      throw new UnauthorizedException('Invalid token role');
    }

    const user = await this.usersService.findActiveAuthUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid session');
    }

    return user;
  }
}