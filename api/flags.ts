import { cache } from "../dist/index.js";

export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("u");
  if (!userId) return Response.error();
  return cache.listFlags(userId).then(Response.json);
}
