import { supabase } from "./supabase";
import { Product } from "../types";

export const syncPricingToSupabase = async (
  products: Product[],
  hotelId: string = "global",
) => {
  try {
    if (!supabase) {
      console.warn(
        "[PricingSync] Supabase not configured. Skipping pricing sync.",
      );
      return;
    }

    const syncKey =
      hotelId === "global" ? "global_pricing" : `pricing_${hotelId}`;
    console.log(`Syncing pricing to Supabase [Scope: ${syncKey}]...`, products);

    // Transform products if necessary (ensure types match Gallery expectations)
    const pricingConfig = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      description: p.description || "",
      category: p.category,
      stock: p.stock,
    }));

    const { error } = await supabase.from("gallery_settings").upsert(
      {
        setting_key: syncKey,
        setting_value: pricingConfig,
      },
      { onConflict: "setting_key" },
    );

    if (error) {
      console.error(`Error syncing pricing [${syncKey}] to Supabase:`, error);
      throw error;
    }

    console.log(`Pricing [${syncKey}] synced successfully.`);
  } catch (err) {
    console.error("Failed to sync pricing:", err);
  }
};
