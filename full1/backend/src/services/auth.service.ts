import { userRepository } from '../repositories/user.repository';
import { hashPassword, comparePassword } from '../utils/hash';
import { signAccessToken, signRefreshToken, signEmailToken, verifyEmailToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { emailService, prefsOf, type EmailPrefs } from './email.service';
import type { AuthTokens, SafeUser } from '../types';
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  VerifyEmailInput,
  EmailPreferencesInput,
} from '../validators/auth.validator';

const VERIFY_TOKEN_TTL = '24h';
const RESET_TOKEN_TTL = '15m';

function toSafeUser(user: {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password: passwordHash,
    });

    const tokens = {
      accessToken: signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      refreshToken: signRefreshToken({ sub: user.id, email: user.email, role: user.role }),
    };

    const userPrefs = prefsOf(user);

    emailService.sendWelcomeEmail(user.email, user.name, userPrefs);

    const verificationToken = signEmailToken(
      { sub: user.id, email: user.email, purpose: 'verify-email' },
      VERIFY_TOKEN_TTL,
    );
    emailService.sendVerificationEmail(
      user.email,
      user.name,
      `${env.email.frontendUrl}/verify-email?token=${verificationToken}`,
      userPrefs,
    );

    return { user: toSafeUser(user), tokens };
  },

  async verifyEmail(input: VerifyEmailInput): Promise<{ email: string }> {
    const payload = verifyEmailToken(input.token);
    if (payload.purpose !== 'verify-email') {
      throw ApiError.badRequest('Invalid verification token');
    }
    const user = await userRepository.findById(payload.sub);
    if (!user || user.email !== payload.email) {
      throw ApiError.badRequest('Invalid verification token');
    }
    return { email: user.email };
  },

  async requestPasswordReset(input: RequestPasswordResetInput): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      // Do not reveal whether the account exists.
      return { message: 'If an account exists for that email, a reset link has been sent.' };
    }

    const resetToken = signEmailToken(
      { sub: user.id, email: user.email, purpose: 'reset-password' },
      RESET_TOKEN_TTL,
    );
    emailService.sendForgotPasswordEmail(
      user.email,
      user.name,
      `${env.email.frontendUrl}/reset-password?token=${resetToken}`,
      prefsOf(user),
    );

    return { message: 'If an account exists for that email, a reset link has been sent.' };
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const payload = verifyEmailToken(input.token);
    if (payload.purpose !== 'reset-password') {
      throw ApiError.badRequest('Invalid or expired reset token');
    }
    const user = await userRepository.findById(payload.sub);
    if (!user || user.email !== payload.email) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    const newPasswordHash = await hashPassword(input.newPassword);
    await userRepository.update(user.id, { password: newPasswordHash });
    emailService.sendPasswordResetEmail(user.email, user.name, prefsOf(user));
  },

  async getEmailPreferences(userId: string): Promise<EmailPrefs> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return prefsOf(user);
  },

  async updateEmailPreferences(userId: string, input: EmailPreferencesInput): Promise<EmailPrefs> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    const updated = await userRepository.update(userId, {
      ...(input.bookingEmails !== undefined ? { bookingEmails: input.bookingEmails } : {}),
      ...(input.marketingEmails !== undefined ? { marketingEmails: input.marketingEmails } : {}),
      ...(input.aiPlannerEmails !== undefined ? { aiPlannerEmails: input.aiPlannerEmails } : {}),
      ...(input.tripReminderEmails !== undefined ? { tripReminderEmails: input.tripReminderEmails } : {}),
    });
    return prefsOf(updated);
  },

  async login(input: LoginInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const passwordMatches = await comparePassword(input.password, user.password);
    if (!passwordMatches) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = {
      accessToken: signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      refreshToken: signRefreshToken({ sub: user.id, email: user.email, role: user.role }),
    };

    return { user: toSafeUser(user), tokens };
  },

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return toSafeUser(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const updated = await userRepository.update(userId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
    });

    return toSafeUser(updated);
  },

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const passwordMatches = await comparePassword(input.oldPassword, user.password);
    if (!passwordMatches) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(input.newPassword);
    await userRepository.update(userId, { password: newPasswordHash });
  },
};
