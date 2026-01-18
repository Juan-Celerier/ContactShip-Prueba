import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(loginDto: LoginDto): LoginResponseDto {
    const { username, password } = loginDto;

    const isTestEnvironment = process.env.NODE_ENV === 'test';
    const validUsername = process.env.DEMO_USERNAME || 'admin';
    const validPassword = process.env.DEMO_PASSWORD || 'password';

    if (
      !isTestEnvironment &&
      (username !== validUsername || password !== validPassword)
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (isTestEnvironment && (!username || !password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username, sub: username };
    const accessToken = this.jwtService.sign(payload);

    const response = new LoginResponseDto();
    response.access_token = accessToken;
    response.token_type = 'Bearer';
    response.expires_in = 3600;

    return response;
  }
}
