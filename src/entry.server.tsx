import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { renderToReadableStream } from "react-dom/server";

// Only used at build time to prerender static HTML (ssr: false), so it always
// waits for all content instead of streaming. This avoids the template's
// `isbot` dependency, which only matters for live server rendering.
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: AbortSignal.timeout(6_000),
      onError(error: unknown) {
        responseStatusCode = 500;
        console.error(error);
      },
    },
  );
  await body.allReady;

  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
