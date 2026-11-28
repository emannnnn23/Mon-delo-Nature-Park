import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { CONTROL_CLASS, FormField } from "~/admin/components/FormField";
import { ImagePicker } from "~/admin/components/ImagePicker";
import { useToast } from "~/admin/components/Toast";
import { useUnsavedChanges } from "~/admin/hooks/useUnsavedChanges";
import { Button } from "~/components/common/Button";
import { useFormDraft } from "~/hooks/useFormDraft";
import { extractMapEmbedUrl } from "~/lib/maps";
import { settingsColumns, settingsSchema } from "~/lib/validation/settings";
import { toFriendlyError } from "~/services/admin/errors";
import { updateSettings } from "~/services/admin/settings";
import type { MediaRow, SettingsRow } from "~/types/db-helpers";

/** What the form edits. JSON-serialisable, so a draft can be kept. */
export type SettingsFormValues = {
  parkName: string;
  tagline: string;
  addressLine: string;
  plusCode: string;
  latitude: string;
  longitude: string;
  mapsEmbedUrl: string;
  mapsListingUrl: string;
  phone: string;
  email: string;
  openingHours: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  googleRating: string;
  googleReviewCount: string;
  defaultOgMediaId: string | null;
};

type TextField = Exclude<keyof SettingsFormValues, "defaultOgMediaId">;
type FieldErrors = Partial<Record<keyof SettingsFormValues, string>>;

/** The form values for a saved row (null becomes an empty field). */
export function settingsFormValues(row: SettingsRow): SettingsFormValues {
  const text = (value: string | number | null) =>
    value === null ? "" : String(value);
  return {
    parkName: row.park_name,
    tagline: text(row.tagline),
    addressLine: row.address_line,
    plusCode: text(row.plus_code),
    latitude: text(row.latitude),
    longitude: text(row.longitude),
    mapsEmbedUrl: text(row.maps_embed_url),
    mapsListingUrl: text(row.maps_listing_url),
    phone: text(row.phone),
    email: text(row.email),
    openingHours: text(row.opening_hours),
    facebookUrl: text(row.facebook_url),
    instagramUrl: text(row.instagram_url),
    tiktokUrl: text(row.tiktok_url),
    youtubeUrl: text(row.youtube_url),
    googleRating: text(row.google_rating),
    googleReviewCount: text(row.google_review_count),
    defaultOgMediaId: row.default_og_media_id,
  };
}

type SettingsPageProps = {
  settings: SettingsRow;
  /** Every photo in the library, to show the share image. */
  media: MediaRow[];
};

function Group({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border border-cream-100 bg-white p-5 sm:p-7">
      <legend className="px-2 font-serif text-xl font-bold text-forest-900">
        {title}
      </legend>
      {intro ? <p className="mb-5 max-w-xl text-ink-600">{intro}</p> : null}
      <div className="flex flex-col gap-5">{children}</div>
    </fieldset>
  );
}

/**
 * The park's name and tagline, where the park is, how to reach it, its social pages, its Google rating and
 * the picture used when the site is shared. One Save for everything. Anything
 * left empty is simply not shown on the website.
 */
export function SettingsPage({ settings, media }: SettingsPageProps) {
  const toast = useToast();
  const [row, setRow] = useState(settings);
  const [values, setValues] = useState(() => settingsFormValues(settings));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [errorTick, setErrorTick] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState(media);
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);

  const saved = useMemo(() => settingsFormValues(row), [row]);
  const isDirty = JSON.stringify(values) !== JSON.stringify(saved);

  const { clear, restored } = useFormDraft(
    `settings:${settings.id}`,
    values,
    (draft) =>
      // A draft may name a photo that no longer exists: drop it, not the rest.
      setValues({
        ...draft,
        defaultOgMediaId:
          draft.defaultOgMediaId &&
          library.some((m) => m.id === draft.defaultOgMediaId)
            ? draft.defaultOgMediaId
            : null,
      }),
  );
  const { leaveDialog } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  useEffect(() => {
    if (errorTick === 0) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [errorTick]);

  function setText(field: TextField, raw: string) {
    // Owners paste Google's whole "Copy HTML" snippet; keep only the map address.
    const value =
      field === "mapsEmbedUrl" && /<iframe\b/i.test(raw)
        ? extractMapEmbedUrl(raw)
        : raw;
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const parsed = settingsSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof SettingsFormValues;
        next[field] ??= issue.message;
      }
      setErrors(next);
      setErrorTick((n) => n + 1);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const updated = await updateSettings(settingsColumns(parsed.data));
      const next = settingsFormValues(updated);
      setRow(updated);
      setValues(next);
      clear(next);
      toast.success("Settings saved.");
    } catch (e) {
      setMessage(toFriendlyError(e, { entity: "setting" }).friendly);
    } finally {
      setBusy(false);
    }
  }

  /** A single-line text field wired to the form state. */
  const text = (
    field: TextField,
    label: string,
    options: {
      optional?: boolean;
      hint?: string;
      type?: string;
      inputMode?: "decimal" | "numeric" | "tel" | "email" | "url";
      autoComplete?: string;
    } = {},
  ) => (
    <FormField
      label={label}
      name={field}
      error={errors[field]}
      hint={options.hint}
      optional={options.optional ?? true}
    >
      <input
        type={options.type ?? "text"}
        inputMode={options.inputMode}
        autoComplete={options.autoComplete}
        value={values[field]}
        onChange={(e) => setText(field, e.target.value)}
        className={CONTROL_CLASS}
      />
    </FormField>
  );

  const photo = library.find((m) => m.id === values.defaultOgMediaId) ?? null;

  return (
    <section aria-labelledby="settings-title">
      <h1
        id="settings-title"
        className="font-serif text-3xl font-bold text-forest-900"
      >
        Contact &amp; settings
      </h1>
      <p className="mt-3 max-w-xl text-ink-600">
        The park&apos;s address, contact details and links. Anything you leave
        empty is not shown on the website, so only fill in what is true and
        confirmed.
      </p>

      {restored ? (
        <p role="status" className="mt-5 font-semibold text-earth-700">
          We restored your unsaved changes from this device. Save to keep them.
        </p>
      ) : null}

      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => void handleSave(e)}
        className="mt-8 flex max-w-3xl flex-col gap-6"
      >
        <Group title="Park details">
          {text("parkName", "Park name", {
            optional: false,
            autoComplete: "off",
            hint: "Shown in the site header, page titles and footer.",
          })}
          {text("tagline", "Tagline", {
            hint: "A short line under the park name in the footer. Leave empty to show none.",
          })}
        </Group>

        <Group title="Location">
          {text("addressLine", "Address", {
            optional: false,
            autoComplete: "off",
          })}
          {text("plusCode", "Plus code", {
            hint: "The short Google code for the spot, like M8GV+8GP.",
          })}
          {text("mapsEmbedUrl", "Map on the Visit page", {
            hint: "In Google Maps, open the park, choose Share, then Embed a map, then Copy HTML. Paste it here — only the map is kept.",
          })}
          {text("mapsListingUrl", "Google Maps listing link", {
            inputMode: "url",
            hint: "The link to the park's Google Maps page, where visitors read reviews. Starts with https://",
          })}
          <div className="grid gap-5 sm:grid-cols-2">
            {text("latitude", "Latitude", {
              inputMode: "decimal",
              hint: "A number from -90 to 90.",
            })}
            {text("longitude", "Longitude", {
              inputMode: "decimal",
              hint: "A number from -180 to 180.",
            })}
          </div>
        </Group>

        <Group
          title="Contact"
          intro="Visitors use these to reach the park. Leave a field empty until you have confirmed it."
        >
          {text("phone", "Phone number", {
            type: "tel",
            inputMode: "tel",
            autoComplete: "off",
            hint: "Digits, spaces and + ( ) - only.",
          })}
          {text("email", "Email address", {
            type: "email",
            inputMode: "email",
            autoComplete: "off",
          })}
          <FormField
            label="Opening hours"
            name="openingHours"
            error={errors.openingHours}
            hint="Write it as you want it shown. Each new line starts on a new line on the website."
            optional
          >
            <textarea
              rows={4}
              value={values.openingHours}
              onChange={(e) => setText("openingHours", e.target.value)}
              className={CONTROL_CLASS}
            />
          </FormField>
        </Group>

        <Group
          title="Social media"
          intro="Full addresses starting with https://. Leave empty for any the park does not have."
        >
          {text("facebookUrl", "Facebook page", { inputMode: "url" })}
          {text("instagramUrl", "Instagram profile", { inputMode: "url" })}
          {text("tiktokUrl", "TikTok profile", { inputMode: "url" })}
          {text("youtubeUrl", "YouTube channel", { inputMode: "url" })}
        </Group>

        <Group
          title="Google rating"
          intro="Copy these from the park's Google Maps page. Leave empty if you are not sure."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {text("googleRating", "Rating", {
              inputMode: "decimal",
              hint: "From 0 to 5, one decimal, like 4.8.",
            })}
            {text("googleReviewCount", "Number of reviews", {
              inputMode: "numeric",
              hint: "A whole number.",
            })}
          </div>
        </Group>

        <Group
          title="Share image"
          intro="The picture shown when a link to the website is shared, for example on Facebook or Messenger."
        >
          <ImagePicker
            value={photo}
            purpose="cover"
            clearable
            onChange={(picked) => {
              if (picked)
                setLibrary((cur) =>
                  cur.some((m) => m.id === picked.id) ? cur : [...cur, picked],
                );
              setValues((v) => ({
                ...v,
                defaultOgMediaId: picked?.id ?? null,
              }));
            }}
          />
        </Group>

        {message ? (
          <p
            ref={messageRef}
            tabIndex={-1}
            role="alert"
            className="font-semibold text-red-700 focus:outline-none"
          >
            {message}
          </p>
        ) : null}

        <div>
          <Button type="submit" disabled={busy || !isDirty}>
            Save changes
          </Button>
        </div>
      </form>

      {leaveDialog}
    </section>
  );
}
