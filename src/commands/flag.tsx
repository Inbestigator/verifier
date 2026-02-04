import { type CommandInteraction, Label, SelectMenu, TextInput } from "@dressed/react";
import type { CommandConfig } from "dressed";

export const config = {
  description: "Flag a user.",
  default_member_permissions: ["Administrator"],
  contexts: ["Guild"],
} satisfies CommandConfig;

export default function (interaction: CommandInteraction) {
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
