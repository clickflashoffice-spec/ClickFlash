import React, { useState } from "react";
import Card from "../common/Card.tsx";
import Spinner from "../common/Spinner.tsx";
import {
  Save,
  Globe,
  LayoutTemplate,
  MessageSquare,
  Image as ImageIcon,
  Link as LinkIcon,
  Star,
  CheckCircle,
} from "lucide-react";
import { apiService } from "../../services/apiService";
import { logger } from "../../utils/logger";
import PortfolioManager from "./website/PortfolioManager";
import { useSystemSetting } from "../../hooks/useSystemSetting";

const WebsiteControlPage: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "general" | "home" | "about" | "contact" | "reviews" | "portfolio"
  >("general");

  // Use synchronized hooks for each section
  const {
    value: generalSettings,
    update: setGeneralSettings,
    isLoading: loadingGeneral,
  } = useSystemSetting("website_general", {
    website_meta_title: "",
    website_meta_description: "",
    website_social_facebook: "",
    website_social_twitter: "",
    website_social_linkedin: "",
    website_social_instagram: "",
    website_footer_copyright: "",
  });

  const {
    value: homeSettings,
    update: setHomeSettings,
    isLoading: loadingHome,
  } = useSystemSetting("website_home", {
    website_hero_title: "",
    website_hero_subtitle: "",
    website_hero_image_url: "",
    website_cta_title: "",
    website_cta_link: "",
  });

  const {
    value: aboutSettings,
    update: setAboutSettings,
    isLoading: loadingAbout,
  } = useSystemSetting("website_about", {
    website_about_title: "",
    website_about_text: "",
    website_about_image_url: "",
  });

  const {
    value: contactSettings,
    update: setContactSettings,
    isLoading: loadingContact,
  } = useSystemSetting("website_contact", {
    website_contact_email: "",
    website_contact_phone: "",
    website_contact_address: "",
    website_contact_map_url: "",
    website_contact_whatsapp: "",
  });

  const {
    value: reviewsSettings,
    update: setReviewsSettings,
    isLoading: loadingReviews,
  } = useSystemSetting("website_reviews", {
    website_google_reviews_id: "",
    website_facebook_reviews_id: "",
    website_getyourguide_reviews_id: "",
    website_manual_review_count: "",
    website_manual_review_rating: "",
    website_reviews_source: "manual", // manual, widget
    website_google_widget_code: "",
    website_facebook_widget_code: "",
    website_getyourguide_widget_code: "",
  });

  const loading =
    loadingGeneral ||
    loadingHome ||
    loadingAbout ||
    loadingContact ||
    loadingReviews;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Updated hooks automatically sync to backend on update
      // We ensure current state is persisted
      await Promise.all([
        setGeneralSettings(generalSettings),
        setHomeSettings(homeSettings),
        setAboutSettings(aboutSettings),
        setContactSettings(contactSettings),
        setReviewsSettings(reviewsSettings),
      ]);

      alert("Settings published successfully!");
    } catch (error) {
      logger.error("Failed to publish website settings", error as Error);
      alert("Failed to publish settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8">
        <Spinner />
      </div>
    );

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
        activeTab === id
          ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Website Control
          </h2>
          <p className="text-slate-400 text-sm font-medium">
            Manage your public website content and settings
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-cyan-500 text-white px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          {saving ? (
            <Spinner size="sm" color="white" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : "Publish Changes"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <TabButton id="general" label="General & SEO" icon={Globe} />
        <TabButton id="home" label="Home Page" icon={LayoutTemplate} />
        <TabButton id="about" label="About & Contact" icon={MessageSquare} />
        <TabButton id="reviews" label="Reviews" icon={Star} />
        <TabButton id="portfolio" label="Portfolio" icon={ImageIcon} />
      </div>

      {/* Content Area */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[500px]">
        {/* GENERAL TAB */}
        {activeTab === "general" && (
          <div className="space-y-6 max-w-3xl">
            <section className="space-y-4">
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-500" /> SEO Settings
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={generalSettings.website_meta_title}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        website_meta_title: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                    placeholder="e.g. ClickFlash | Premium Photography"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Meta Description
                  </label>
                  <textarea
                    value={generalSettings.website_meta_description}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        website_meta_description: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all resize-none h-32"
                    placeholder="Brief description for search engines..."
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 pt-8 border-t border-slate-100">
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-cyan-500" /> Social Media
                Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Facebook URL
                  </label>
                  <input
                    type="text"
                    value={generalSettings.website_social_facebook}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        website_social_facebook: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Instagram URL
                  </label>
                  <input
                    type="text"
                    value={generalSettings.website_social_instagram}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        website_social_instagram: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* HOME TAB */}
        {activeTab === "home" && (
          <div className="space-y-8 max-w-3xl">
            <section className="space-y-4">
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                Hero Section
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Hero Title
                  </label>
                  <input
                    type="text"
                    value={homeSettings.website_hero_title}
                    onChange={(e) =>
                      setHomeSettings({
                        ...homeSettings,
                        website_hero_title: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-lg font-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Hero Subtitle
                  </label>
                  <input
                    type="text"
                    value={homeSettings.website_hero_subtitle}
                    onChange={(e) =>
                      setHomeSettings({
                        ...homeSettings,
                        website_hero_subtitle: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Hero Background Image URL
                  </label>
                  <input
                    type="text"
                    value={homeSettings.website_hero_image_url}
                    onChange={(e) =>
                      setHomeSettings({
                        ...homeSettings,
                        website_hero_image_url: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-mono text-slate-500"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 pt-8 border-t border-slate-100">
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                Call to Action
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    CTA Title
                  </label>
                  <input
                    type="text"
                    value={homeSettings.website_cta_title}
                    onChange={(e) =>
                      setHomeSettings({
                        ...homeSettings,
                        website_cta_title: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    CTA Link (Internal path)
                  </label>
                  <input
                    type="text"
                    value={homeSettings.website_cta_link}
                    onChange={(e) =>
                      setHomeSettings({
                        ...homeSettings,
                        website_cta_link: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold"
                    placeholder="/contact"
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ABOUT & CONTACT TAB */}
        {activeTab === "about" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                About Section
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Title
                  </label>
                  <input
                    type="text"
                    value={aboutSettings.website_about_title}
                    onChange={(e) =>
                      setAboutSettings({
                        ...aboutSettings,
                        website_about_title: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Content
                  </label>
                  <textarea
                    value={aboutSettings.website_about_text}
                    onChange={(e) =>
                      setAboutSettings({
                        ...aboutSettings,
                        website_about_text: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm h-48 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Image URL
                  </label>
                  <input
                    type="text"
                    value={aboutSettings.website_about_image_url}
                    onChange={(e) =>
                      setAboutSettings({
                        ...aboutSettings,
                        website_about_image_url: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-mono text-slate-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                Contact Info
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={contactSettings.website_contact_email}
                    onChange={(e) =>
                      setContactSettings({
                        ...contactSettings,
                        website_contact_email: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={contactSettings.website_contact_phone}
                    onChange={(e) =>
                      setContactSettings({
                        ...contactSettings,
                        website_contact_phone: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={contactSettings.website_contact_whatsapp}
                    onChange={(e) =>
                      setContactSettings({
                        ...contactSettings,
                        website_contact_whatsapp: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold"
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Address
                  </label>
                  <textarea
                    value={contactSettings.website_contact_address}
                    onChange={(e) =>
                      setContactSettings({
                        ...contactSettings,
                        website_contact_address: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm h-24 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === "reviews" && (
          <div className="space-y-8 max-w-4xl">
            {/* Source Selector */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 mb-4">
                Review Data Source
              </h3>
              <div className="flex gap-4">
                <button
                  onClick={() =>
                    setReviewsSettings({
                      ...reviewsSettings,
                      website_reviews_source: "manual",
                    })
                  }
                  className={`flex-1 py-4 rounded-xl border-2 text-sm font-bold transition-all ${reviewsSettings.website_reviews_source === "manual" ? "border-cyan-500 bg-white text-cyan-600 shadow-md" : "border-transparent bg-white text-slate-400 hover:border-slate-200"}`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() =>
                    setReviewsSettings({
                      ...reviewsSettings,
                      website_reviews_source: "widget",
                    })
                  }
                  className={`flex-1 py-4 rounded-xl border-2 text-sm font-bold transition-all ${reviewsSettings.website_reviews_source === "widget" ? "border-cyan-500 bg-white text-cyan-600 shadow-md" : "border-transparent bg-white text-slate-400 hover:border-slate-200"}`}
                >
                  3rd Party Widget
                </button>
              </div>
            </div>

            {/* MANUAL SETTINGS */}
            {reviewsSettings.website_reviews_source === "manual" && (
              <section className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                  Manual Review Stats
                </h3>
                <p className="text-sm text-slate-400">
                  These numbers will be displayed statically on your site.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Total Review Count
                    </label>
                    <input
                      type="text"
                      value={reviewsSettings.website_manual_review_count}
                      onChange={(e) =>
                        setReviewsSettings({
                          ...reviewsSettings,
                          website_manual_review_count: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold"
                      placeholder="e.g. 2,045"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Average Rating
                    </label>
                    <input
                      type="text"
                      value={reviewsSettings.website_manual_review_rating}
                      onChange={(e) =>
                        setReviewsSettings({
                          ...reviewsSettings,
                          website_manual_review_rating: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold"
                      placeholder="e.g. 4.9"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* WIDGET SETTINGS */}
            {reviewsSettings.website_reviews_source === "widget" && (
              <section className="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm font-medium border border-blue-100 flex items-center gap-3">
                  <Star className="w-5 h-5" />
                  <span>
                    Paste the **Embed Widget Code** (e.g. from Elfsight) for
                    each platform below.
                  </span>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                    Google Reviews Plugin
                  </h3>
                  <textarea
                    value={reviewsSettings.website_google_widget_code}
                    onChange={(e) =>
                      setReviewsSettings({
                        ...reviewsSettings,
                        website_google_widget_code: e.target.value,
                      })
                    }
                    className="w-full bg-slate-900 text-slate-300 border border-slate-800 p-4 rounded-xl text-xs font-mono h-32 resize-none shadow-inner"
                    placeholder="Paste Google Reviews widget code here..."
                  />
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                    Facebook Reviews Plugin
                  </h3>
                  <textarea
                    value={reviewsSettings.website_facebook_widget_code}
                    onChange={(e) =>
                      setReviewsSettings({
                        ...reviewsSettings,
                        website_facebook_widget_code: e.target.value,
                      })
                    }
                    className="w-full bg-slate-900 text-slate-300 border border-slate-800 p-4 rounded-xl text-xs font-mono h-32 resize-none shadow-inner"
                    placeholder="Paste Facebook Reviews widget code here..."
                  />
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                    GetYourGuide Plugin
                  </h3>
                  <textarea
                    value={reviewsSettings.website_getyourguide_widget_code}
                    onChange={(e) =>
                      setReviewsSettings({
                        ...reviewsSettings,
                        website_getyourguide_widget_code: e.target.value,
                      })
                    }
                    className="w-full bg-slate-900 text-slate-300 border border-slate-800 p-4 rounded-xl text-xs font-mono h-32 resize-none shadow-inner"
                    placeholder="Paste GetYourGuide widget code here..."
                  />
                </div>
              </section>
            )}
          </div>
        )}

        {/* PORTFOLIO TAB */}
        {activeTab === "portfolio" && <PortfolioManager />}
      </div>
    </div>
  );
};

export default WebsiteControlPage;
