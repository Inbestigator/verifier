import {
  type CommandInteraction,
  Container,
  Label,
  SelectMenu,
  Separator,
  TextDisplay,
  TextInput,
} from "@dressed/react";
import { type CommandConfig, CommandOption } from "dressed";
import { Fragment } from "react";
import { cache } from "../db/index.ts";

export const config = {
  description: "List/submit flags for a user.",
  default_member_permissions: ["Administrator"],
  contexts: ["Guild"],
  options: [
    CommandOption({ type: "Subcommand", name: "submit", description: "Submit a new flag." }),
    CommandOption({
      type: "Subcommand",
      name: "list",
      description: "List all flags for a user.",
      options: [CommandOption({ type: "User", name: "user", description: "The user to search for.", required: true })],
    }),
  ],
} satisfies CommandConfig;

export default async function (interaction: CommandInteraction<typeof config>) {
  const { list } = interaction.options;

  if (!list) {
    return interaction.showModal(
      <>
        <Label label="User">
          <SelectMenu type="User" custom_id="user" />
        </Label>
        <Label label="Reason">
          <TextInput custom_id="reason" style="Paragraph" max_length={255} />
        </Label>
        <Label label="Remove roles">
          <SelectMenu type="Role" custom_id="roles" max_values={25} required={false} />
        </Label>
      </>,
      { custom_id: "flag", title: "Flag a user" },
    );
  }

  const user = list.options.user;

  const [flags] = await Promise.all([cache.listFlags(user.id), interaction.deferReply({ ephemeral: true })]);

  return interaction.editReply(
    <Container>
      ### Flags submitted for &lt;@{user.id}&gt;
      {
        await Promise.all(
          flags.map(async (f) => {
            const guild = await cache.getGuild(f.server).catch(() => ({ name: "`unknown`" }));
            return (
              <Fragment key={f.server}>
                <Separator />
                -# &lt;t:{Math.round(new Date(f.createdAt).getTime() / 1000)}:R&gt; in {guild.name}
                <TextDisplay>{f.reason}</TextDisplay>
              </Fragment>
            );
          }),
        )
      }
    </Container>,
  );
}
