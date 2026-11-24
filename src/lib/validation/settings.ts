import { z } from "zod";

import { extractMapEmbedUrl, isGoogleEmbed } from "~/lib/maps";
import type { SettingsUpdate } from "~/types/db-helpers";

/**
 * Contact and site settings. The rules mirror public.site_settings: an
 * address is required; links and social media are https addresses; the map
 * must be a Google Maps embed; the phone uses the contact form's pattern; the
 * email is a valid address of at most 254 characters; the rating is 0 to 5
 * with one decimal and the review count a whole number from 0. Everything
 * optional may be empty (it is stored as null, see `settingsColumns`). Lengths
 * count code points of the trimmed text, as Postgres does.
 *
 * The form keeps numbers as text so a half-typed value is not lost; numbers
 * are accepted too.
 */

/** site_settings https checks (maps_listing_url and the social links). */
export const HTTPS_PATTERN = /^https:\/\//;
/** site_settings_phone_check, the same as the contact form. */
export const PHONE_PATTERN = /^[0-9 +()-]{0,30}$/;
/** site_settings_email_check. */
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/i;

const MAX_EMAIL_LENGTH = 254;
const MAX_INTEGER = 2_147_483_647;

const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;
const RATING_PATTERN = /^\d+(?:\.\d)?$/;
const COUNT_PATTERN = /^\d+$/;

const text = z.string().trim();
/** A number as typed: text, or a number turned into text. */
const numberText = z.preprocess(
  (value) => (typeof value === "number" ? String(value) : value),
  z.string().trim(),
);

export const settingsSchema = z
  .object({
    addressLine: text,
    plusCode: text,
    latitude: numberText,
    longitude: numberText,
    mapsEmbedUrl: z.string().transform(extractMapEmbedUrl),
    mapsListingUrl: text,
    phone: text,
    email: text,
    openingHours: text,
    facebookUrl: text,
    instagramUrl: text,
    tiktokUrl: text,
    youtubeUrl: text,
    googleRating: numberText,
    googleReviewCount: numberText,
    defaultOgMediaId: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if ([...value.addressLine].length === 0) {
      add("addressLine", "Please enter the park's address.");
    }

    const coordinate = (
      field: "latitude" | "longitude",
      limit: number,
      label: string,
    ) => {
      const raw = value[field];
      if (raw === "") return;
      const n = Number(raw);
      if (!DECIMAL_PATTERN.test(raw) || !(Math.abs(n) <= limit)) {
        add(field, `${label} must be a number from -${limit} to ${limit}.`);
      }
    };
    coordinate("latitude", 90, "Latitude");
    coordinate("longitude", 180, "Longitude");

    if (value.mapsEmbedUrl !== "" && !isGoogleEmbed(value.mapsEmbedUrl)) {
      add(
        "mapsEmbedUrl",
        "That isn't a Google Maps map. In Google Maps, open the park, choose Share, then Embed a map, then Copy HTML, and paste it here.",
      );
    }

    const httpsFields = [
      ["mapsListingUrl", "Use a full address starting with https://"],
      ["facebookUrl", "Use a full address starting with https://"],
      ["instagramUrl", "Use a full address starting with https://"],
      ["tiktokUrl", "Use a full address starting with https://"],
      ["youtubeUrl", "Use a full address starting with https://"],
    ] as const;
    for (const [field, message] of httpsFields) {
      if (value[field] !== "" && !HTTPS_PATTERN.test(value[field])) {
        add(field, message);
      }
    }

    if (value.phone !== "" && !PHONE_PATTERN.test(value.phone)) {
      add("phone", "Use digits, spaces and + ( ) - only, up to 30 characters.");
    }

    if (value.email !== "") {
      if ([...value.email].length > MAX_EMAIL_LENGTH) {
        add("email", "The email must be 254 characters or fewer.");
      } else if (!EMAIL_PATTERN.test(value.email)) {
        add("email", "Please enter a valid email address.");
      }
    }

    if (value.googleRating !== "") {
      const n = Number(value.googleRating);
      if (!RATING_PATTERN.test(value.googleRating)) {
        add(
          "googleRating",
          "Use a number from 0 to 5 with one decimal, like 4.8.",
        );
      } else if (n > 5) {
        add("googleRating", "The rating cannot be more than 5.");
      }
    }

    if (value.googleReviewCount !== "") {
      if (
        !COUNT_PATTERN.test(value.googleReviewCount) ||
        Number(value.googleReviewCount) > MAX_INTEGER
      ) {
        add("googleReviewCount", "Use a whole number, 0 or more.");
      }
    }
  });

export type SettingsInput = z.infer<typeof settingsSchema>;

const orNull = (s: string) => (s === "" ? null : s);
const numberOrNull = (s: string) => (s === "" ? null : Number(s));

/** The columns written for checked settings: empty optional fields are null. */
export function settingsColumns(data: SettingsInput): SettingsUpdate {
  return {
    address_line: data.addressLine,
    plus_code: orNull(data.plusCode),
    latitude: numberOrNull(data.latitude),
    longitude: numberOrNull(data.longitude),
    maps_embed_url: orNull(data.mapsEmbedUrl),
    maps_listing_url: orNull(data.mapsListingUrl),
    phone: orNull(data.phone),
    email: orNull(data.email),
    opening_hours: orNull(data.openingHours),
    facebook_url: orNull(data.facebookUrl),
    instagram_url: orNull(data.instagramUrl),
    tiktok_url: orNull(data.tiktokUrl),
    youtube_url: orNull(data.youtubeUrl),
    google_rating: numberOrNull(data.googleRating),
    google_review_count: numberOrNull(data.googleReviewCount),
    default_og_media_id: data.defaultOgMediaId,
  };
}
