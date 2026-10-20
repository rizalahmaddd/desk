import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { getCloudflareEnv, getDb } from "./db";
import * as schema from "./db/schema";
import { sendEmail } from "./email";
import { APP_NAME } from "./constants";
import { createD1RateLimitStorage } from "./rate-limit";

export async function getAuth() {
  const [db, env] = await Promise.all([getDb(), getCloudflareEnv()]);
  const baseURL = env.BETTER_AUTH_URL || env.APP_URL;

  return betterAuth({
    appName: APP_NAME,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: `Reset password ${APP_NAME}`,
          heading: "Atur ulang password",
          body: "Kami menerima permintaan untuk mengatur ulang password akun Anda. Tautan ini berlaku selama 1 jam.",
          action: { label: "Atur ulang password", url },
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: `Verifikasi email ${APP_NAME}`,
          heading: "Verifikasi email Anda",
          body: "Klik tombol di bawah untuk mengaktifkan akun dan mulai mengelola project.",
          action: { label: "Verifikasi email", url },
        });
      },
    },
    plugins: [
      magicLink({
        expiresIn: 15 * 60,
        sendMagicLink: async ({ email, url }) => {
          await sendEmail({
            to: email,
            subject: `Masuk ke ${APP_NAME}`,
            heading: "Masuk tanpa password",
            body: "Gunakan tautan di bawah untuk masuk. Tautan berlaku selama 15 menit dan hanya bisa dipakai sekali.",
            action: { label: `Masuk ke ${APP_NAME}`, url },
          });
        },
      }),
    ],
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customStorage: createD1RateLimitStorage(env.DB),
      customRules: {
        "/sign-in/email": { window: 300, max: 10 },
        "/sign-up/email": { window: 3600, max: 5 },
        "/sign-in/magic-link": { window: 600, max: 3 },
        "/request-password-reset": { window: 600, max: 3 },
        "/reset-password": { window: 600, max: 10 },
        "/send-verification-email": { window: 600, max: 3 },
        "/get-session": false,
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
  });
}

export type Auth = Awaited<ReturnType<typeof getAuth>>;
