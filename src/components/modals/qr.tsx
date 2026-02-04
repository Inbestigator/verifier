import type { Params } from "@dressed/matcher";
import type { ModalSubmitInteraction } from "@dressed/react";
import { and, eq, isNull } from "drizzle-orm";
import { generate } from "otplib";
import { cache, db } from "../../db";
import { usersTable } from "../../db/schema";
import { completeAuthorization, failAuthorization } from "../../utils";

export const pattern = `qr-:role(\\d+)`;

export default async function (interaction: ModalSubmitInteraction, { role }: Params<typeof pattern>) {
  const userId = interaction.user.id;
  const { secret, failedAuths, totalAuths } = await cache.getDBUser(userId);
  const code = await generate({ secret });
  if (interaction.getField("code", true).textInput() !== code) {
    return failAuthorization(interaction);
  }
  return Promise.all([
    db
      .update(usersTable)
      .set({ verifiedAt: new Date() })
      .where(and(eq(usersTable.id, userId), isNull(usersTable.verifiedAt))),
    cache.getDBUser.clear(userId),
    completeAuthorization(interaction, role, { failedAuths, totalAuths }),
  ]);
}
