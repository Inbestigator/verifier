import { handleRequest, setupCommands, setupComponents, setupEvents } from "dressed/server";
import { commands, components, events } from "../.dressed";

export default {
  fetch: (req: Request, _env: never, ctx: { waitUntil: <T>(f: T) => T }) =>
    handleRequest(
      req,
      (...p) => ctx.waitUntil(setupCommands(commands)(...p)),
      (...p) => ctx.waitUntil(setupComponents(components)(...p)),
      (...p) => ctx.waitUntil(setupEvents(events)(...p)),
    ),
};
