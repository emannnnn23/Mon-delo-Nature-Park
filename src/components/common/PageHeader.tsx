type PageHeaderProps = {
  title: string;
  /** A short line under the title; left out when null. */
  body?: string | null;
};

/**
 * Forest header band for listing pages: the page's h1 over a low sun and ridge
 * line, echoing the logo and the homepage hero.
 */
export function PageHeader({ title, body = null }: PageHeaderProps) {
  return (
    <header
      data-surface="dark"
      className="relative isolate overflow-hidden bg-forest-900 text-ivory-50"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 1200 300"
        preserveAspectRatio="xMaxYMax slice"
        className="absolute inset-0 -z-10 h-full w-full"
      >
        <circle cx="930" cy="214" r="46" fill="#d6aa55" opacity="0.9" />
        <path
          d="M0 236 C160 196 280 192 420 220 S700 250 860 208 S1080 178 1200 206 V300 H0Z"
          fill="#244b3a"
        />
        <path
          d="M0 236 C160 196 280 192 420 220 S700 250 860 208 S1080 178 1200 206"
          fill="none"
          stroke="#d6aa55"
          strokeWidth="2"
          opacity="0.55"
        />
        <path
          d="M0 268 C220 238 420 250 640 266 S980 276 1200 250 V300 H0Z"
          fill="#10301f"
          opacity="0.7"
        />
      </svg>
      <div className="mx-auto max-w-7xl px-5 pt-14 pb-24 sm:px-8 md:pt-20 md:pb-32">
        <h1 className="max-w-3xl font-serif text-4xl leading-tight font-bold text-balance break-words md:text-6xl">
          {title}
        </h1>
        {body ? (
          <p className="mt-5 max-w-xl font-serif text-lg leading-relaxed text-ivory-50/90 italic md:text-xl">
            {body}
          </p>
        ) : null}
      </div>
    </header>
  );
}
