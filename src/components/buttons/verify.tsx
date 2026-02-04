import type { Params } from "@dressed/matcher";
import { Label, type MessageComponentInteraction, TextInput } from "@dressed/react";
import { generateURI } from "otplib";
import qrcode from "qrcode-terminal";
import { cache } from "../../db";
import { completeAuthorization } from "../../utils";

export const pattern = `verify-:role(\\d+)-:forceOTP(true|false)`;

export default async function (interaction: MessageComponentInteraction, { role, ...args }: Params<typeof pattern>) {
  const forceOTP = args.forceOTP === "true";

  if (interaction.member?.roles.includes(role)) {
    return interaction.reply("You are already authorized", { ephemeral: true });
  }

  const { secret, lastFlagged, verifiedAt, failedAuths, totalAuths, lastAuthorized } = await cache.getDBUser(
    interaction.user.id,
  );

  if (
    !forceOTP &&
    verifiedAt &&
    lastAuthorized &&
    Date.now() - new Date(lastFlagged).getTime() > 5 * 60 * 1000 &&
    new Date(lastAuthorized).getTime() > new Date(lastFlagged).getTime()
  ) {
    return completeAuthorization(interaction, role, { failedAuths, totalAuths });
  }

  return interaction.showModal(
    <>
      {!verifiedAt && (
        <>
          ### Scan this QR code with your authenticator app:{"\n"}
          ```
          {
            await new Promise<string>((r) =>
              qrcode.generate(
                generateURI({ label: interaction.user.username, issuer: "Dressed Auth", secret }),
                { small: true },
                r,
              ),
            )
          }
          ```{"\n"}
          ### If you are unable to scan it, enter this secret key instead:
          {"\n"}## `{secret}`
        </>
      )}
      <Label label="Enter code" description="Enter the code shown in your authenticator app.">
        <TextInput custom_id="code" min_length={6} max_length={6} />
      </Label>
    </>,
    { custom_id: `qr-${role}`, title: `${verifiedAt ? "Verify" : "Register"} TOTP` },
  );
}
