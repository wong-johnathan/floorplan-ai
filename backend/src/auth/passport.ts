import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../db/prisma';

export async function upsertGoogleUser(profile: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}) {
  // 1. Try to find by email first (connects seeded admin user to real Google login)
  const byEmail = profile.email
    ? await prisma.user.findUnique({ where: { email: profile.email } })
    : null;

  if (byEmail) {
    // Update the googleId to the real one, preserve role (e.g., admin from seed)
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId: profile.id, name: profile.name, avatarUrl: profile.avatarUrl },
    });
  }

  // 2. Try by googleId (subsequent logins after first)
  const byGoogle = await prisma.user.findUnique({ where: { googleId: profile.id } });
  if (byGoogle) {
    return prisma.user.update({
      where: { id: byGoogle.id },
      data: { email: profile.email, name: profile.name, avatarUrl: profile.avatarUrl },
    });
  }

  // 3. Create new user
  return prisma.user.create({
    data: {
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
