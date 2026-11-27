import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { Link } from "react-router";
import type { SiteSettings } from "../../types/content";
import { Button } from "../common/Button";
import { Logo } from "../common/Logo";
import { NAV_LINKS } from "./navLinks";
import {
  FacebookIcon,
  InstagramIcon,
  TiktokIcon,
  YoutubeIcon,
} from "./SocialIcons";

type SiteFooterProps = {
  settings: SiteSettings;
  /** Copyright year, fixed by the route loader so server and client agree. */
  year: number;
};

const FALLBACK_TAGLINE = "Nature. Relaxation. Unforgettable Moments.";

const SOCIALS: {
  key: keyof SiteSettings["socials"];
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "youtube", label: "YouTube", Icon: YoutubeIcon },
  { key: "tiktok", label: "TikTok", Icon: TiktokIcon },
];

const linkClass =
  "inline-flex min-h-11 items-center text-ivory-50/90 transition-colors hover:text-gold-500";

/** Green band closing every public page. Contact and social rows appear only when set. */
export function SiteFooter({ settings, year }: SiteFooterProps) {
  const { addressLine, phone, email, mapsListingUrl, socials } = settings;
  const socialLinks = SOCIALS.filter(({ key }) => socials[key]);

  return (
    <footer data-surface="dark" className="bg-forest-900 text-ivory-50">
      <div className="mx-auto max-w-7xl px-5 pt-14 pb-8 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.8fr_1.3fr] lg:gap-0">
          <div className="flex flex-col items-start gap-4 lg:items-center lg:px-8 lg:text-center">
            <Logo tone="light" />
            <p className="font-serif text-lg text-ivory-50/90 italic">
              {settings.tagline ?? FALLBACK_TAGLINE}
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="lg:border-l lg:border-ivory-50/15 lg:px-8"
          >
            <ul className="flex flex-wrap gap-x-6 lg:flex-col">
              {NAV_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col items-start gap-3 lg:border-l lg:border-ivory-50/15 lg:px-8">
            {addressLine ? (
              <p className="flex items-start gap-3">
                <MapPin
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-gold-500"
                />
                <span>{addressLine}</span>
              </p>
            ) : null}
            {phone ? (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className={linkClass}
              >
                <Phone
                  aria-hidden="true"
                  className="mr-3 size-5 shrink-0 text-gold-500"
                />
                {phone}
              </a>
            ) : null}
            {email ? (
              <a href={`mailto:${email}`} className={linkClass}>
                <Mail
                  aria-hidden="true"
                  className="mr-3 size-5 shrink-0 text-gold-500"
                />
                {email}
              </a>
            ) : null}
            {mapsListingUrl ? (
              <Button
                href={mapsListingUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline-light"
                icon={ArrowRight}
              >
                Get Directions
              </Button>
            ) : null}
            {socialLinks.length > 0 ? (
              <ul className="mt-2 flex gap-2">
                {socialLinks.map(({ key, label, Icon }) => (
                  <li key={key}>
                    <a
                      href={socials[key] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="inline-flex size-11 items-center justify-center rounded-full border border-ivory-50/30 transition-colors hover:border-gold-500 hover:text-gold-500"
                    >
                      <Icon className="size-5" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <p className="mt-10 border-t border-gold-500/40 pt-6 text-sm text-ivory-50/80">
          © {year} Mondelos Nature Park. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
