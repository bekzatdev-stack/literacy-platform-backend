import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterParentDto } from './dto/register-parent.dto';
import { AuthUser } from './interfaces/auth-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UserRepository } from './repositories/user.repository';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async registerParent(registerParentDto: RegisterParentDto) {
    const existingUser = await this.userRepository.findByEmail(
      registerParentDto.email,
    );

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(
      registerParentDto.password,
      PASSWORD_SALT_ROUNDS,
    );

    const user = await this.userRepository.createParent({
      email: registerParentDto.email,
      passwordHash,
      firstName: registerParentDto.firstName,
      lastName: registerParentDto.lastName,
    });

    return this.issueTokensForUser(user.id, user.email, user.role);
  }

  async loginParent(loginDto: LoginDto) {
    const user = await this.userRepository.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokensForUser(user.id, user.email, user.role);
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshTokenDto.refreshToken,
        {
          secret: this.getRefreshSecret(),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.tokenType !== 'refresh' || payload.accountType !== 'USER') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedRefreshToken =
      await this.refreshTokenRepository.findLatestActiveUserToken(payload.sub);

    if (!storedRefreshToken || storedRefreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshTokenDto.refreshToken,
      storedRefreshToken.tokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.issueTokensForUser(user.id, user.email, user.role);
  }

  async logout(currentUser: AuthUser) {
    await this.refreshTokenRepository.revokeAllUserTokens(currentUser.sub);

    return {
      message: 'Logged out successfully',
    };
  }

  private async issueTokensForUser(
    userId: string,
    email: string,
    role: UserRole,
  ) {
    const accessPayload: JwtPayload = {
      sub: userId,
      role,
      accountType: 'USER',
      tokenType: 'access',
    };
    const refreshPayload: JwtPayload = {
      sub: userId,
      role,
      accountType: 'USER',
      tokenType: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.getAccessSecret(),
        expiresIn: this.getAccessTokenExpiresIn(),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshTokenExpiresIn(),
      }),
    ]);

    const refreshTokenHash = await bcrypt.hash(
      refreshToken,
      PASSWORD_SALT_ROUNDS,
    );
    const refreshTokenExpiresAt = this.calculateRefreshTokenExpiryDate();

    await this.refreshTokenRepository.revokeAllUserTokens(userId);
    await this.refreshTokenRepository.createUserToken(
      userId,
      refreshTokenHash,
      refreshTokenExpiresAt,
    );

    return {
      user: {
        id: userId,
        email,
        role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  private getAccessSecret() {
    const value = this.configService.get<string>('JWT_ACCESS_SECRET');

    if (!value) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    return value;
  }

  private getRefreshSecret() {
    const value = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!value) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    return value;
  }

  private getAccessTokenExpiresIn() {
    return (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
      '15m') as StringValue;
  }

  private getRefreshTokenExpiresIn() {
    return (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
      '7d') as StringValue;
  }

  private calculateRefreshTokenExpiryDate() {
    const now = new Date();
    const expiresInDays = 7;

    now.setDate(now.getDate() + expiresInDays);
    return now;
  }
}
