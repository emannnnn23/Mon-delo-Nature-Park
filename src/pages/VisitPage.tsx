import { ChevronDown, Clock, Mail, MapPin, Phone } from "lucide-react";

import {
  ContactForm,
  type ContactSubmit,
} from "../components/forms/ContactForm";
import { DirectionsButton, MapsCard } from "../components/common/MapsCard";
import { MapEmbed } from "../components/common/MapEmbed";
import { PageHeader } from "../components/common/PageHeader";
import { SampleTag } from "../components/common/SampleTag";
import { SectionHeading } from "../components/common/SectionHeading";
import type { Faq, PageSection, SiteSettings } from "../types/content";
import { splitParagraphs } from "../utils/text";

export type VisitPageProps = {
  sections: PageSection[];
  faqs: Faq[];
  settings: SiteSettings;
  /** Sends the contact form. Phase 4 supplies it; until then the form is closed. */
  onSubmit?: ContactSubmit;
};

/** Neutral structural labels, used only when a section has no heading. */
const FALLBACK_LABEL: Record<string, string> = {
  intro: "Plan Your Visit",
  getting_here: "Getting Here",
};

const contactClass =
  "inline-flex min-h-11 items-center gap-3 text-ink-900 underline decoration-gold-500/0 decoration-2 underline-offset-4 transition-colors hover:decoration-gold-500";

function TextSection({ section }: { section: PageSection }) {
  const id = `visit-${section.key}`;
  const paragraphs = splitParagraphs(section.body);
  // A heading with nothing under it is noise: leave the section out.
  if (paragraphs.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col items-start gap-3">
      <h2
        id={id}
        className="font-serif text-3xl leading-tight font-bold text-balance text-forest-900 md:text-4xl"
      >
        {section.heading ?? FALLBACK_LABEL[section.key]}
      </h2>
      {section.isSample ? <SampleTag /> : null}
      <div className="max-w-prose space-y-4 text-base leading-relaxed text-ink-600 md:text-lg">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  );
}

/**
 * Visit Us: header band, how to plan the visit and get here, address, contact
 * details, opening hours, the map, FAQs and the contact form. Anything the
 * park has not provided is left out.
 */
export function VisitPage({
  sections,
  faqs,
  settings,
  onSubmit,
}: VisitPageProps) {
  const { addressLine, plusCode, phone, email, openingHours, mapsEmbedUrl } =
    settings;
  const textSections = ["intro", "getting_here"]
    .map((key) => sections.find((s) => s.key === key))
    .filter((s): s is PageSection => s !== undefined);
  // Without an embed URL the Google Maps card shows the plus code and
  // address, so they are not repeated here.
  const showAddress = Boolean(mapsEmbedUrl);
  const hasContact = Boolean(phone) || Boolean(email) || Boolean(openingHours);
  const showPlusCode = plusCode !== null && !addressLine.includes(plusCode);
  const hasFaqs = faqs.length > 0;

  return (
    <>
      <PageHeader title="Visit Us" />

      <div className="bg-ivory-50 py-14 md:py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div className="flex flex-col gap-10">
            {textSections.map((section) => (
              <TextSection key={section.key} section={section} />
            ))}

            {showAddress || hasContact ? (
              <section
                aria-labelledby="visit-address"
                className="flex flex-col items-start gap-4"
              >
                <h2
                  id="visit-address"
                  className="font-serif text-3xl leading-tight font-bold text-forest-900 md:text-4xl"
                >
                  {showAddress ? "Address and contact" : "Contact"}
                </h2>
                {showAddress || phone || email ? (
                  <address className="flex flex-col gap-1 not-italic">
                    {showAddress ? (
                      <p className="flex items-start gap-3 py-2.5 text-ink-900">
                        <MapPin
                          aria-hidden="true"
                          className="mt-0.5 size-5 shrink-0 text-earth-700"
                        />
                        <span>
                          <span>{addressLine}</span>
                          {showPlusCode ? (
                            <span className="mt-1 block text-sm text-ink-600">
                              Plus code{" "}
                              <span className="font-medium">{plusCode}</span>
                            </span>
                          ) : null}
                        </span>
                      </p>
                    ) : null}
                    {phone ? (
                      <a
                        href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                        className={contactClass}
                      >
                        <Phone
                          aria-hidden="true"
                          className="size-5 shrink-0 text-earth-700"
                        />
                        {phone}
                      </a>
                    ) : null}
                    {email ? (
                      <a href={`mailto:${email}`} className={contactClass}>
                        <Mail
                          aria-hidden="true"
                          className="size-5 shrink-0 text-earth-700"
                        />
                        {email}
                      </a>
                    ) : null}
                  </address>
                ) : null}

                {openingHours ? (
                  <div className="flex items-start gap-3">
                    <Clock
                      aria-hidden="true"
                      className="mt-1 size-5 shrink-0 text-earth-700"
                    />
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-forest-900">
                        Opening hours
                      </h3>
                      <p className="mt-1 whitespace-pre-line text-ink-900">
                        {openingHours}
                      </p>
                    </div>
                  </div>
                ) : null}

                {mapsEmbedUrl ? (
                  <div className="mt-2">
                    <DirectionsButton settings={settings} />
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="lg:sticky lg:top-28 lg:self-start">
            {mapsEmbedUrl ? (
              <MapEmbed
                src={mapsEmbedUrl}
                title={`Map showing ${settings.parkName}`}
                className="shadow-[0_24px_60px_-30px_rgb(24_63_50/0.5)]"
              />
            ) : (
              <MapsCard settings={settings} headingLevel="h2" />
            )}
          </div>
        </div>
      </div>

      {hasFaqs ? (
        <section
          aria-labelledby="visit-faq"
          className="bg-cream-100/55 py-14 md:py-20"
        >
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <SectionHeading id="visit-faq" title="Frequently Asked Questions" />
            <div className="mt-8 divide-y divide-earth-600/25 border-y border-earth-600/25">
              {faqs.map((faq) => (
                <details key={faq.id} className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-semibold text-forest-900 marker:hidden [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <ChevronDown
                      aria-hidden="true"
                      className="size-5 shrink-0 text-earth-700 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                    />
                  </summary>
                  <div className="space-y-3 pb-5 leading-relaxed text-ink-600">
                    {splitParagraphs(faq.answer).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Bands alternate: cream after the ivory block when there is no FAQ band. */}
      <section
        aria-labelledby="visit-contact"
        className={`${hasFaqs ? "bg-ivory-50" : "bg-cream-100/55"} py-14 md:py-20`}
      >
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <SectionHeading id="visit-contact" title="Send Us a Message" />
          <div
            className={`mt-8 rounded-2xl p-6 ring-1 ring-earth-600/15 sm:p-8 ${
              hasFaqs ? "bg-cream-100/55" : "bg-ivory-50"
            }`}
          >
            <ContactForm onSubmit={onSubmit} />
          </div>
        </div>
      </section>
    </>
  );
}
