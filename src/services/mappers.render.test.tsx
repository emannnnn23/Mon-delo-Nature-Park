import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { HomePage } from "../pages/HomePage";
import { selectHomeContent } from "../lib/homeContent";
import type { Row } from "../types/db-helpers";
import { toAttraction, toSettings } from "./mappers";

const settingsRow: Row<"site_settings"> = {
  id: "s",
  singleton: true,
  park_name: "Mondelos Nature Park",
  tagline: null,
  short_description: null,
  address_line: "Somewhere",
  plus_code: null,
  latitude: null,
  longitude: null,
  maps_embed_url: null,
  maps_listing_url: null,
  phone: null,
  email: null,
  opening_hours: null,
  facebook_url: null,
  instagram_url: null,
  tiktok_url: null,
  youtube_url: null,
  google_rating: null,
  google_review_count: null,
  default_og_media_id: null,
  created_at: "x",
  updated_at: "x",
};

describe("a mapped attraction with no cover", () => {
  it("shows 'Photo coming soon' on the homepage instead of a broken image", () => {
    const attraction = toAttraction({
      id: "a1",
      kind: "attraction",
      slug: "falls",
      name: "Hidden Falls",
      summary: "A quiet falls.",
      description: null,
      icon: null,
      cover_media_id: null,
      is_featured: true,
      is_published: true,
      sort_order: 0,
      is_sample: false,
      created_at: "x",
      updated_at: "x",
      cover: null,
    });
    expect(attraction.cover).toBeNull();

    const props = selectHomeContent({
      settings: toSettings({ ...settingsRow, default_og: null }),
      sections: [],
      attractions: [attraction],
      galleryImages: [],
      testimonials: [],
    });
    render(
      <MemoryRouter>
        <HomePage {...props} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Hidden Falls")).toBeInTheDocument();
    expect(screen.getAllByText(/photo coming soon/i).length).toBeGreaterThan(0);
  });
});
