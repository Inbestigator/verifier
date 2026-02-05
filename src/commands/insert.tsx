import { ActionRow, Button, type CommandInteraction, createMessage } from "@dressed/react";
import { type CommandConfig, CommandOption } from "dressed";

export const config = {
  description: "Insert a verification message into the channel.",
  default_member_permissions: ["Administrator"],
  contexts: ["Guild"],
  options: [
    CommandOption({
      type: "Role",
      name: "role",
      description: "The role to assign on successful validation.",
      required: true,
    }),
    CommandOption({
      type: "String",
      name: "force-otp",
      description: "Always force the user to enter the code from their authenticator app. (default no)",
      choices: [
        { name: "Yes", value: "true" },
        { name: "No", value: "false" },
      ],
    }),
  ],
} satisfies CommandConfig;

export default function (interaction: CommandInteraction<typeof config>) {
  const { role, "force-otp": forceOTP = "false" } = interaction.options;
  return Promise.all([
    createMessage(
      interaction.channel.id,
      <ActionRow>
        <Button custom_id={`verify-${role.id}-${forceOTP}`} label="Verify" emoji={{ name: "🔓" }} />
      </ActionRow>,
    ),
    interaction.reply("Created message", { ephemeral: true }),
  ]);
}
