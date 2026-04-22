import type { DressedConfig } from "@dressed/framework";
import { patchInteraction } from "@dressed/react";

export default {
  build: { include: ["**/*.{ts,tsx}"] },
  port: 3000,
  middleware: { commands: (i) => [patchInteraction(i)], components: (i, ...p) => [patchInteraction(i), ...p] },
} satisfies DressedConfig;
