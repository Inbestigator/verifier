import type { Params } from "@dressed/matcher";
import { Label, type MessageComponentInteraction, TextInput } from "@dressed/react";
import { Fragment } from "react";
import { cache } from "../../db";

export const pattern = `challenge-:role(\\d+)`;

export default async function (
  interaction: MessageComponentInteraction,
  { role }: Params<typeof pattern>,
  challenge?: Awaited<ReturnType<typeof cache.getChallenge>>,
) {
  challenge ??= await cache.getChallenge(interaction.user.id);
  return interaction.showModal(
    <>
      This challenge will expire &lt;t:{challenge.expiresAt}:R&gt;.
      {challenge.steps.map((s, i) => (
        <Fragment key={s}>
          {"\n"}
          {i + 1}. {s}
        </Fragment>
      ))}
      <Label label="Verify" description="Enter the next logical sequence of emojis.">
        <TextInput custom_id="sequence" />
      </Label>
    </>,
    {
      custom_id: `challenge-${role}`,
      title: "Challenge",
    },
  );
}
