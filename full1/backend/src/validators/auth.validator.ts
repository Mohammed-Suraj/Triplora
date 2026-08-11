import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name must be under 80 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be under 72 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Provide a valid email address'),
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name must be under 80 characters').optional(),
    avatar: z.string().trim().nullable().optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string({ required_error: 'Current password is required' }).min(1, 'Current password is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be under 72 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

export const requestPasswordResetSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Provide a valid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string({ required_error: 'Reset token is required' }).min(1, 'Reset token is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be under 72 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string({ required_error: 'Verification token is required' }).min(1, 'Verification token is required'),
  }),
});

export const emailPreferencesSchema = z.object({
  body: z.object({
    bookingEmails: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
    aiPlannerEmails: z.boolean().optional(),
    tripReminderEmails: z.boolean().optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type EmailPreferencesInput = z.infer<typeof emailPreferencesSchema>['body'];

