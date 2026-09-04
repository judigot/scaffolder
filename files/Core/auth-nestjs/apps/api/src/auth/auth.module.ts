import { AuthModule } from '@thallesp/nestjs-better-auth';
import type { createNestAuth } from './auth';

export type INestAuth = ReturnType<typeof createNestAuth>;

export const AuthNestModule = {
  forRoot(auth: INestAuth) {
    return AuthModule.forRoot({
      auth,
      disableTrustedOriginsCors: false,
      disableGlobalAuthGuard: false,
    });
  },
};
