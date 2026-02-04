import type { ModalSubmitInteraction } from "@dressed/react";
import { removeMemberRole } from "dressed";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { flagsTable, usersTable } from "../../db/schema";

export default async function (interaction: ModalSubmitInteraction) {
  const [{ id: userId } = {}] = interaction.getField("user", true).userSelect();
  const reason = interaction.getField("reason", true).textInput();
  const roles = interaction.getField("roles")?.roleSelect() ?? [];
  const { guild } = interaction;

  if (!userId || !guild) return;

  const [[updatedUser]] = await Promise.all([
    db
      .update(usersTable)
      .set({ lastFlagged: new Date() })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id }),
    interaction.deferReply({ ephemeral: true }),
  ]);

  if (!updatedUser) return interaction.editReply("That user hasn't been initialized yet!");

  const [flag] = await Promise.all([
    db
      .insert(flagsTable)
      .values({ flagger: interaction.user.id, user: userId, reason, server: guild.id })
      .returning({ user: flagsTable.user })
      .catch(() => []),
    ...roles.map(async ({ id }) => {
      try {
        await removeMemberRole(guild.id, userId, id);
      } catch {}
    }),
  ]);

  return interaction.editReply(flag.length ? "Submitted flag" : "That user has already been flagged in this server!");
}
