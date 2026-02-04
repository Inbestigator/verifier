import { ActionRow, Button, type MessageComponentInteraction, type ModalSubmitInteraction } from "@dressed/react";
import { InteractionType } from "discord-api-types/v10";
import { addMemberRole } from "dressed";
import { eq, sql } from "drizzle-orm";
import showChallenge from "./components/buttons/challenge";
import { cache, db, redis, resolveKey } from "./db";
import { usersTable } from "./db/schema";

export async function completeAuthorization(
  interaction: MessageComponentInteraction | ModalSubmitInteraction,
  role: string,
  ratio?: { failedAuths: number; totalAuths: number },
) {
  if (!interaction.guild) return;

  const userId = interaction.user.id;
  const existingChallenge = await redis.keys(resolveKey("getChallenge", [userId as never]));

  if (
    existingChallenge.length ||
    (ratio &&
      ratio.totalAuths > 0 &&
      (ratio.failedAuths / ratio.totalAuths >= 0.4 + Math.log(ratio.totalAuths + 1) / 10 || Math.random() < 0.2))
  ) {
    const challenge = await cache.getChallenge(userId);
    if (interaction.type === InteractionType.ModalSubmit) {
      return interaction.reply(
        <>
          Please click this button to complete a challenge before verification can complete.
          <ActionRow>
            <Button custom_id={`challenge-${role}`} label="Complete" />
          </ActionRow>
          -# Challenge expires &lt;t:{challenge.expiresAt}:R&gt;
        </>,
        { ephemeral: true },
      );
    }
    return showChallenge(interaction, { role });
  }

  return Promise.all([
    db
      .update(usersTable)
      .set({ totalAuths: sql`${usersTable.totalAuths} + 1`, lastAuthorized: new Date() })
      .where(eq(usersTable.id, userId)),
    addMemberRole(interaction.guild.id, userId, role),
    interaction.reply("# ✅\n### Authorized", { ephemeral: true }),
  ]);
}

export async function failAuthorization(interaction: MessageComponentInteraction | ModalSubmitInteraction) {
  const userId = interaction.user.id;
  return Promise.all([
    db
      .update(usersTable)
      .set({
        lastFlagged: new Date(),
        failedAuths: sql`${usersTable.failedAuths} + 1`,
        totalAuths: sql`${usersTable.totalAuths} + 1`,
      })
      .where(eq(usersTable.id, userId)),
    cache.getDBUser.clear(userId),
    interaction.reply("# ❌\n### Could not authorize!", { ephemeral: true }),
  ]);
}
