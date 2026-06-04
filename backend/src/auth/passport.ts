import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../db/prisma';

export async function upsertGoogleUser(profile: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}) {
  return prisma.user.upsert({
    where: { googleId: profile.id },
    update: { email: profile.email, name: profile.name, avatarUrl: profile.avatarUrl },
    create: {
      googleId: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    },
  });
}

if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await upsertGoogleUser({
            id: profile.id,
            email: profile.emails?.[0]?.value ?? '',
            name: profile.displayName ?? '',
            avatarUrl: profile.photos?.[0]?.value ?? null,
          });
          done(null, user);
        } catch (err) {
          done(err as Error, undefined);
        }
      }
    )
  );
}

export default passport;
