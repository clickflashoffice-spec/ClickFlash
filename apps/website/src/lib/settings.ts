import { logger } from '@clickflash/logger';
import { getApiBaseUrl } from "./env";

const API_BASE_URL = getApiBaseUrl();

export interface WebsiteSettings {
  // General
  metaTitle?: string;
  metaDescription?: string;

  // Plugins
  googleReviewsId?: string;
  facebookReviewsId?: string;
  getYourGuideReviewsId?: string;
  manualReviewCount?: string;
  manualReviewRating?: string;
  instagramFeedId?: string;
  reviewsWidgetId?: string;

  // Stats
  statsPhotographers?: string;
  statsClients?: string;
  statsYears?: string;

  // Home
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;

  // About
  aboutTitle?: string;
  aboutText?: string;
  aboutPoints?: string[];
  aboutImageUrl?: string;

  // CTA
  ctaTitle?: string;
  ctaLink?: string;

  // Vision
  visionTitle?: string;
  visionText1?: string;
  visionText2?: string;
  visionText3?: string;

  // Services
  service1Title?: string;
  service1Desc?: string;
  service1Image?: string;
  service2Title?: string;
  service2Desc?: string;
  service2Image?: string;
  service3Title?: string;
  service3Desc?: string;
  service3Image?: string;

  // Contact
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  contactMapUrl?: string;
  contactWhatsapp?: string;

  // Footer / Social
  footerCopyright?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialLinkedin?: string;
  socialInstagram?: string;
  // Live Reviews Integration
  googlePlacesApiKey?: string;
  googlePlaceId?: string;
  facebookPageId?: string;
  facebookAccessToken?: string;
  reviewsSource?: "manual" | "live" | "widget";
  googleWidgetCode?: string;
  facebookWidgetCode?: string;
  getyourguideWidgetCode?: string;
}

// Map the DB keys (e.g., website_hero_title) to our internal interface keys (e.g., heroTitle)
const KEY_MAPPING: Record<string, keyof WebsiteSettings> = {
  website_meta_title: "metaTitle",
  website_meta_description: "metaDescription",
  website_google_reviews_id: "googleReviewsId",
  website_facebook_reviews_id: "facebookReviewsId",
  website_getyourguide_reviews_id: "getYourGuideReviewsId",
  website_manual_review_count: "manualReviewCount",
  website_manual_review_rating: "manualReviewRating",
  website_instagram_feed_id: "instagramFeedId",
  website_reviews_widget_id: "reviewsWidgetId",
  website_stats_photographers: "statsPhotographers",
  website_stats_clients: "statsClients",
  website_stats_years: "statsYears",
  website_hero_title: "heroTitle",
  website_hero_subtitle: "heroSubtitle",
  website_hero_image_url: "heroImageUrl",
  // About
  website_about_title: "aboutTitle",
  website_about_text: "aboutText",
  website_about_points: "aboutPoints",
  website_about_image_url: "aboutImageUrl",
  // CTA
  website_cta_title: "ctaTitle",
  website_cta_link: "ctaLink",
  website_vision_title: "visionTitle",
  website_vision_text1: "visionText1",
  website_vision_text2: "visionText2",
  website_vision_text3: "visionText3",
  website_contact_email: "contactEmail",
  website_contact_phone: "contactPhone",
  website_contact_address: "contactAddress",
  website_contact_map_url: "contactMapUrl",
  website_contact_whatsapp: "contactWhatsapp",
  website_service1_title: "service1Title",
  website_service1_desc: "service1Desc",
  website_service1_image: "service1Image",
  website_service2_title: "service2Title",
  website_service2_desc: "service2Desc",
  website_service2_image: "service2Image",
  website_service3_title: "service3Title",
  website_service3_desc: "service3Desc",
  website_service3_image: "service3Image",
  website_footer_copyright: "footerCopyright",
  website_social_facebook: "socialFacebook",
  website_social_twitter: "socialTwitter",
  website_social_linkedin: "socialLinkedin",
  website_social_instagram: "socialInstagram",
  website_google_places_api_key: "googlePlacesApiKey",
  website_google_place_id: "googlePlaceId",
  website_facebook_page_id: "facebookPageId",
  website_facebook_access_token: "facebookAccessToken",
  website_reviews_source: "reviewsSource",
  website_google_widget_code: "googleWidgetCode",
  website_facebook_widget_code: "facebookWidgetCode",
  website_getyourguide_widget_code: "getyourguideWidgetCode",
};

export async function fetchWebsiteSettings(): Promise<WebsiteSettings> {
  try {
    // Fetch all settings from the 'settings' collection
    // Since we can't search simply by matching keys efficiently in one go without a filter,
    // we'll try to fetch all or a subset.
    // Best approach for now: fetch specific ID if possible, BUT the management app stores them as INDIVIDUAL records where ID = key.
    // So we need to fetch the LIST of settings.

    // We will fetch ALL settings (collection 'settings') and filter.
    // Assuming the list endpoint is available and not too huge (settings are usually few).
    const response = await fetch(`${API_BASE_URL}/api/collections/settings/records?perPage=100`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      logger.warn("Failed to fetch settings, using defaults");
      return {};
    }

    interface SettingRecord {
      id: string;
      value: unknown;
    }
    interface SettingsListResponse {
      items?: SettingRecord[];
    }
    const data = (await response.json()) as SettingsListResponse;
    const records: SettingRecord[] = data.items || [];

    const settings: WebsiteSettings = {};

    records.forEach((record: SettingRecord) => {
      // record.id is the KEY (e.g. 'website_hero_title')
      // record.value is the VALUE — typed `unknown` because the PocketBase
      // settings collection stores heterogeneous JSON; per-field assertions
      // happen below.
      const internalKey = KEY_MAPPING[record.id];
      if (!internalKey) return;

      if (internalKey === "aboutPoints" && typeof record.value === "string") {
        settings[internalKey] = record.value
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      } else {
        // The API returns the value as the target field's type by convention;
        // assert per-key to satisfy WebsiteSettings's heterogeneous shape.
        // Using a type-asserting helper keeps the indexed assignment well-typed.
        (settings as Record<string, unknown>)[internalKey] = record.value;
      }
    });

    return settings;
  } catch (error) {
    const isConnRefused =
      error instanceof Error &&
      (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED"));
    if (isConnRefused) {
      logger.warn("API Offline: Using default website settings during build/prerender.");
    } else {
      logger.error("Error fetching website settings:", error instanceof Error ? error : undefined);
    }
    return {};
  }
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description: string;
  image_url: string;
  featured: boolean;
  sort_order: number;
}

export async function fetchPortfolioItems(): Promise<PortfolioItem[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/collections/portfolio/records?sort=sort_order,-created&perPage=100`,
      {
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      logger.warn("Failed to fetch portfolio items");
      return [];
    }

    interface PortfolioRecord {
      id: string;
      title: string;
      category: string;
      description: string;
      image?: string;
      image_url?: string;
      featured: boolean;
      sort_order: number;
    }
    interface PortfolioListResponse {
      items?: PortfolioRecord[];
    }
    const data = (await response.json()) as PortfolioListResponse;
    return (data.items || []).map((item: PortfolioRecord) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      description: item.description,
      image_url: item.image
        ? item.image.startsWith("http")
          ? item.image
          : `${API_BASE_URL}/api/files/portfolio/${item.id}/${item.image}`
        : (item.image_url ?? ""),
      featured: item.featured,
      sort_order: item.sort_order,
    }));
  } catch (error) {
    const isConnRefused =
      error instanceof Error &&
      (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED"));
    if (isConnRefused) {
      logger.warn("API Offline: Skipping portfolio items during build/prerender.");
    } else {
      logger.error("Error fetching portfolio items:", error instanceof Error ? error : undefined);
    }
    return [];
  }
}
