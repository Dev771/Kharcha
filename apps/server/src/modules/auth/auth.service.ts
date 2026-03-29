import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';

const BCRYPT_COST = 12;

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  defaultCurrency: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name.trim(),
      },
      select: USER_SELECT,
    });

    const accessToken = this.generateToken(user.id);

    return { accessToken, user };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.generateToken(user.id);

    const { passwordHash, ...sanitizedUser } = user;

    return { accessToken, user: sanitizedUser };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  /**
   * Handle OAuth sign-in. Finds or creates user by email.
   * Called by the BFF when Google OAuth succeeds.
   */
  async oauthLogin(profile: {
    email: string;
    name: string;
    image?: string | null;
    provider: string;
    providerAccountId: string;
  }) {
    const email = profile.email.toLowerCase().trim();

    let user = await this.prisma.user.findUnique({
      where: { email },
      select: USER_SELECT,
    });

    if (!user) {
      // Create new user from OAuth profile (no password)
      user = await this.prisma.user.create({
        data: {
          email,
          name: profile.name,
          avatarUrl: profile.image || null,
        },
        select: USER_SELECT,
      });
    }

    if (!user.isActive) {
      return null;
    }

    const accessToken = this.generateToken(user.id);
    return { accessToken, user };
  }

  private generateToken(userId: string): string {
    return this.jwtService.sign({ sub: userId }, { expiresIn: '7d' });
  }
}
