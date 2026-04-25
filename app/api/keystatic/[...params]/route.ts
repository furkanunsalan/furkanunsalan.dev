import { makeRouteHandler } from "@keystatic/next/route-handler";
import config from "../../../../keystatic.config";

export const dynamic = "force-dynamic";

const handlers = makeRouteHandler({ config });

// Next.js standalone constructs request.url from the bind address
// (HOSTNAME:PORT, e.g. 127.0.0.1:3010), not the public host. Keystatic uses
// `new URL(request.url).origin` to build the OAuth redirect_uri, so without
// rewriting we'd send GitHub a redirect_uri pointing at 127.0.0.1.
//
// If KEYSTATIC_URL is set, replace the host/protocol on the incoming
// Request so Keystatic's downstream URL math sees the public origin.
function rewriteOrigin(req: Request): Request {
  const base = process.env.KEYSTATIC_URL;
  if (!base) return req;
  try {
    const target = new URL(base);
    const u = new URL(req.url);
    u.protocol = target.protocol;
    u.hostname = target.hostname;
    u.port = target.port; // empty string clears the inherited bind port
    return new Request(u.toString(), req);
  } catch {
    return req;
  }
}

export const GET = (req: Request) => handlers.GET(rewriteOrigin(req));
export const POST = (req: Request) => handlers.POST(rewriteOrigin(req));
