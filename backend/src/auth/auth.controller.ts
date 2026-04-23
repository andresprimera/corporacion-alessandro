import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { signupSchema, type SignupInput } from './dto/signup.dto';
import { loginSchema, type LoginInput } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('signup')
  signup(@Body(new ZodValidationPipe(signupSchema)) dto: SignupInput) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput) {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @CurrentUser() user: { userId: string; email: string; refreshToken: string },
  ) {
    return this.authService.refreshTokens(user.userId, user.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser('userId') userId: string) {
    return this.authService.logout(userId);
  }
}
