import type { Params } from "@dressed/matcher";
import type { ModalSubmitInteraction } from "@dressed/react";
import { MessageFlags } from "discord-api-types/v10";
import { cache } from "../../db";
import { completeAuthorization, failAuthorization } from "../../utils";

export const pattern = `challenge-:role(\\d+)`;

export default async function (interaction: ModalSubmitInteraction, { role }: Params<typeof pattern>) {
  const userId = interaction.user.id;
  const [challenge] = await Promise.all([cache.getChallenge(userId), cache.getChallenge.clear(userId)]);
  if (interaction.getField("sequence", true).textInput() !== challenge.correct) {
    return failAuthorization(interaction);
  }
  if (interaction.message?.flags && interaction.message.flags & MessageFlags.Ephemeral) {
    interaction.reply = interaction.update;
  }
  return completeAuthorization(interaction, role);
}
