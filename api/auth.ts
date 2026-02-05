import { cache } from "../src/db";

export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("u");
  if (!userId) return Response.error();
  return cache.getDBUser(userId, true).then(({ secret, ...user }) => Response.json(user));
}
