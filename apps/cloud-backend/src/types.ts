export type Bindings = {
  PHOTO_BUCKET: R2Bucket;
  DB_MENA: D1Database;
  DB_EU: D1Database;
  DB_AMER: D1Database;
  DB_APAC: D1Database;
  AI_TAGGER_QUEUE: Queue;
  GEMINI_API_KEY: string;
  RESEND_API_KEY: string;
  JWT_SECRET?: string;
  SERVICE_API_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    DB: D1Database;
    regionId: string;
    principal?: import('./auth').Principal;
  };
};
