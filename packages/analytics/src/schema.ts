import { z } from "zod";

export const BaseEventSchema = z.object({
  timestamp: z.string().datetime(),
  app_version: z.string().optional(),
  user_id: z.string().optional(),
  session_id: z.string().optional(),
});

export const CheckoutStartedSchema = BaseEventSchema.extend({
  event: z.literal("checkout_started"),
  properties: z.object({
    cart_value: z.number(),
    item_count: z.number()
  })
});

export const CheckoutCompletedSchema = BaseEventSchema.extend({
  event: z.literal("checkout_completed"),
  properties: z.object({
    cart_value: z.number(),
    yield_tier: z.string().optional(),
    currency: z.string()
  })
});

export const GalleryUnlockedSchema = BaseEventSchema.extend({
  event: z.literal("gallery_unlocked"),
  properties: z.object({
    method: z.enum(["biometric", "ble", "qr"])
  })
});

export const PhotoDownloadedSchema = BaseEventSchema.extend({
  event: z.literal("photo_downloaded"),
  properties: z.object({
    format: z.enum(["highres", "tiny"])
  })
});

export const FaceScanCompletedSchema = BaseEventSchema.extend({
  event: z.literal("face_scan_completed"),
  properties: z.object({
    match_confidence: z.number(),
    duration_ms: z.number()
  })
});

export const UploadBatchStartedSchema = BaseEventSchema.extend({
  event: z.literal("upload_batch_started"),
  properties: z.object({
    photo_count: z.number(),
    network_type: z.string().optional()
  })
});

export const UploadBatchCompletedSchema = BaseEventSchema.extend({
  event: z.literal("upload_batch_completed"),
  properties: z.object({
    success_count: z.number(),
    fail_count: z.number()
  })
});

export const AnalyticsEventSchema = z.discriminatedUnion("event", [
  CheckoutStartedSchema,
  CheckoutCompletedSchema,
  GalleryUnlockedSchema,
  PhotoDownloadedSchema,
  FaceScanCompletedSchema,
  UploadBatchStartedSchema,
  UploadBatchCompletedSchema
]);

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
