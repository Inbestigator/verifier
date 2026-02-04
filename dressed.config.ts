import type { DressedConfig } from "@dressed/framework";
import { patchInteraction } from "@dressed/react";

export default {
  build: { extensions: ["tsx", "ts"] },
  port: 3000,
  middleware: { commands: (i) => [patchInteraction(i)], components: (i, ...p) => [patchInteraction(i), ...p] },
} satisfies DressedConfig;
