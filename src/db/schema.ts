import { integer, pgTable, primaryKey, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text().primaryKey(),
  secret: varchar({ length: 32 }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  lastFlagged: timestamp("last_flagged", { withTimezone: true }).defaultNow().notNull(),
  lastAuthorized: timestamp("last_authorized", { withTimezone: true }),
  failedAuths: integer("failed_auths").default(0).notNull(),
  totalAuths: integer("total_auths").default(0).notNull(),
});

export const flagsTable = pgTable(
  "flags",
  {
    user: text()
      .notNull()
      .references(() => usersTable.id),
    server: text().notNull(),
    flagger: text().notNull(),
    reason: varchar({ length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.user, table.server] })],
);
