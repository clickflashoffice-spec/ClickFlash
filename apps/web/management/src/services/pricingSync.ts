import { Product } from "../types";
import { logger } from '@/utils/logger';

export const syncPricingToCloudBackend = async (
  products: Product[],
  hotelId: string = "global",
) => {
  try {
    const backendUrl = import.meta.env.VITE_CLOUD_BACKEND_URL;
    if (!backendUrl) {
      logger.warn(
        "[PricingSync] VITE_CLOUD_BACKEND_URL not configured. Skipping pricing sync.",
      );
      return;
    }

    const syncKey =
      hotelId === "global" ? "global_pricing" : `pricing_${hotelId}`;
    logger.info(`Syncing pricing to Cloud Backend [Scope: ${syncKey}]...`, products);

    // Transform products if necessary (ensure types match Gallery expectations)
    const pricingConfig = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      description: p.description || "",
      category: p.category,
      stock: p.stock,
    }));

    const response = await fetch(`${backendUrl}/api/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        setting_key: syncKey,
        setting_value: pricingConfig,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    logger.info(`Pricing [${syncKey}] synced successfully.`);
  } catch (err) {
    logger.error("Failed to sync pricing:", err);
  }
};
