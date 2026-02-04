import type { CommandInteraction } from "@dressed/react";
import { eq } from "drizzle-orm";
import { cache, db } from "../db";
import { usersTable } from "../db/schema";

export default async function (interaction: CommandInteraction) {
  const userId = interaction.user.id;
  const [updated] = await Promise.all([
    db
      .update(usersTable)
      .set({ verifiedAt: null, lastFlagged: new Date() })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id }),
    interaction.deferReply({ ephemeral: true }),
  ]);
  return Promise.all([
    cache.getDBUser.clear(userId),
    interaction.editReply(
      updated.length
        ? "Reset TOTP system\n-# Try clicking a verification button again to register it"
        : "No pre-existing user found\n-# Try clicking a verification button to get started",
    ),
  ]);
}
