import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import "@fontsource-variable/dm-sans";
import "@fontsource/playfair-display/latin-400.css";
import "@fontsource/playfair-display/latin-400-italic.css";
import "@fontsource/playfair-display/latin-600.css";
import "@fontsource/playfair-display/latin-700.css";
import playfair600Latin from "@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff2?url";

import { Logo } from "./components/common/Logo";
import { ErrorContent } from "./pages/ErrorPage";
import { NotFoundContent } from "./pages/NotFoundPage";
import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  {
    rel: "preload",
    href: playfair600Latin,
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/**
 * Last-resort boundary, outside the public layout (no header or footer data),
 * so it brings its own main landmark and a logo link home. It shares the look
 * of the in-layout 404 and error screens.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const stack =
    import.meta.env.DEV && error instanceof Error ? error.stack : undefined;

  return (
    <main id="main" className="flex min-h-screen flex-col bg-ivory-50">
      <div className="mx-auto w-full max-w-7xl px-5 pt-6 sm:px-8">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center rounded-sm"
          aria-label="Mondelos Nature Park home"
        >
          <Logo />
        </Link>
      </div>
      {notFound ? <NotFoundContent /> : <ErrorContent />}
      {stack ? (
        <pre className="mx-auto mb-10 w-full max-w-4xl overflow-x-auto px-5 text-xs text-ink-600 sm:px-8">
          <code>{stack}</code>
        </pre>
      ) : null}
    </main>
  );
}
