import { hash } from "node:crypto";
import { createCache, getters } from "@dressed/ws/cache";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { generateSecret } from "otplib";
import { createClient } from "redis";
import { flagsTable, usersTable } from "./schema.ts";

export const resolveKey = (key: string, args: string[]) => `${key.toString()}:${hash("sha1", JSON.stringify(args))}`;

export const redis = await createClient({ url: process.env.REDIS_URL }).connect();
export const db = drizzle(process.env.DATABASE_URL as string);

// Captcha-like thing, not the best idea ever but it should work
export const challenges = [
  // Increment
  [
    { steps: ["2️⃣", "2️⃣4️⃣", "2️⃣4️⃣6️⃣"], correct: "2️⃣4️⃣6️⃣8️⃣" },
    { steps: ["1️⃣", "1️⃣3️⃣", "1️⃣3️⃣5️⃣"], correct: "1️⃣3️⃣5️⃣7️⃣" },
    { steps: ["0️⃣", "0️⃣1️⃣", "0️⃣1️⃣2️⃣"], correct: "0️⃣1️⃣2️⃣3️⃣" },
  ],
  // Fill
  [
    { steps: ["🟩🟩🏠🟩🟩", "🐑🟩🏠🟩🐑"], correct: "🐑🐑🏠🐑🐑" },
    { steps: ["🌲🌲🏠🌲🌲", "🌲🐦🏠🐦🌲"], correct: "🐦🐦🏠🐦🐦" },
    { steps: ["⬛⬛⬛⬛⬛", "⬛⬛⬜⬛⬛", "⬛⬜⬜⬜⬛"], correct: "⬜⬜⬜⬜⬜" },
  ],
  // Alternate
  [
    { steps: ["⬜", "⬜🟥", "⬜🟥⬜"], correct: "⬜🟥⬜🟥" },
    { steps: ["⬛", "⬛⬜", "⬛⬜⬛"], correct: "⬛⬜⬛⬜" },
    { steps: ["🟦", "🟦🟨", "🟦🟨🟦"], correct: "🟦🟨🟦🟨" },
  ],
  // Add one
  [
    { steps: ["⭐", "⭐⭐", "⭐⭐⭐"], correct: "⭐⭐⭐⭐" },
    { steps: ["🔥", "🔥🔥", "🔥🔥🔥"], correct: "🔥🔥🔥🔥" },
    { steps: ["💧", "💧💧", "💧💧💧"], correct: "💧💧💧💧" },
  ],
  // Shift
  [
    { steps: ["🔴🟢🔵", "🟢🔵🔴", "🔵🔴🟢"], correct: "🔴🟢🔵" },
    { steps: ["🍎🍌🍇", "🍌🍇🍎", "🍇🍎🍌"], correct: "🍎🍌🍇" },
    { steps: ["⬆️➡️⬇️", "➡️⬇️⬆️", "⬇️⬆️➡️"], correct: "⬆️➡️⬇️" },
  ],
  // Swap
  [
    { steps: ["🐱🐶", "🐶🐱", "🐱🐶"], correct: "🐶🐱" },
    { steps: ["🟥🟦", "🟦🟥", "🟥🟦"], correct: "🟦🟥" },
    { steps: ["⬆️⬇️", "⬇️⬆️", "⬆️⬇️"], correct: "⬇️⬆️" },
  ],
  // Invert
  [
    { steps: ["🟦🟥🟦", "🟥🟦🟥", "🟦🟥🟦"], correct: "🟥🟦🟥" },
    { steps: ["🟩🟨🟩", "🟨🟩🟨", "🟩🟨🟩"], correct: "🟨🟩🟨" },
    { steps: ["⬛⬜⬛", "⬜⬛⬜", "⬛⬜⬛"], correct: "⬜⬛⬜" },
  ],
  // Countdown
  [
    { steps: ["5️⃣4️⃣3️⃣", "4️⃣3️⃣2️⃣", "3️⃣2️⃣1️⃣"], correct: "2️⃣1️⃣0️⃣" },
    { steps: ["4️⃣3️⃣", "3️⃣2️⃣", "2️⃣1️⃣"], correct: "1️⃣0️⃣" },
    { steps: ["3️⃣2️⃣1️⃣0️⃣", "2️⃣1️⃣0️⃣", "1️⃣0️⃣"], correct: "0️⃣" },
  ],
];

export const cache = createCache(
  {
    ...getters,
    async getChallenge(_user: string) {
      const challengeVariations = challenges[Math.floor(Math.random() * challenges.length)];
      if (!challengeVariations) throw new Error("No challenges");
      const variation = challengeVariations[Math.floor(Math.random() * challengeVariations.length)];
      if (!variation) throw new Error("No variations");
      return { ...variation, expiresAt: Math.round(Date.now() / 1000) + 5 * 60 };
    },
    async getDBUser(userId: string, noSet?: boolean) {
      let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (!user) {
        if (noSet) throw new Error("No user found with that ID");
        [user] = await db.insert(usersTable).values({ id: userId, secret: generateSecret() }).returning();
      }
      return user as typeof usersTable.$inferSelect;
    },
    listFlags: (userId: string) =>
      db.select().from(flagsTable).where(eq(flagsTable.user, userId)).orderBy(desc(flagsTable.createdAt)).limit(16),
  },
  {
    desiredProps: { getGuild: ["name"] },
    logic: {
      async get(key) {
        const res = await redis.get(key);
        if (!res) return { state: "miss" };
        const data = JSON.parse(res);
        return { state: Date.now() < data.staleAt ? "hit" : "stale", ...data };
      },
      set(key, value) {
        redis.set(
          key,
          JSON.stringify({ staleAt: Date.now() + (key.startsWith("getChallenge") ? 4 : 25) * 6e4, value }),
          {
            expiration: { type: "EX", value: key.startsWith("getChallenge") ? 300 : 1800 },
          },
        );
      },
      delete: (k) => redis.del(k),
      resolveKey: resolveKey as never,
    },
  },
);
