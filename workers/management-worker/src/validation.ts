import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  machine_id: z.string().optional(),
});

export const userSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["Admin", "Photographer", "Client"]),
  status: z.enum(["active", "inactive"]).default("active"),
  workingHours: z.any().optional(),
  password: z.string().min(6).optional(),
});

export const albumSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2),
  date: z.string(),
  status: z.string(),
  photographerId: z.union([z.string(), z.number()]),
  eventType: z.string().optional(),
  roomNumber: z.string().optional(),
  source: z.string().optional(),
  categories: z.array(z.string()).optional(),
  desk_id: z.string().optional(),
  original_id: z.string().optional(),
});

export const photoSchema = z.object({
  id: z.string().optional(),
  albumId: z.string(),
  url: z.string(),
  manualEdits: z.any().optional(),
  desk_id: z.string().optional(),
  original_id: z.string().optional(),
});

export const orderSchema = z.object({
  id: z.string().optional(),
  date: z.string(),
  status: z.string(),
  clientName: z.string(),
  albumId: z.string(),
  totalAmount: z.number().optional(),
  total: z.number().optional(),
  items: z.any().optional(),
  desk_id: z.string().optional(),
  original_id: z.string().optional(),
});

export const recordSchemas: Record<string, z.ZodObject<any>> = {
  users: userSchema,
  albums: albumSchema,
  photos: photoSchema,
  orders: orderSchema,
};

export function validateRequest(
  data: any,
  table: string,
  isUpdate: boolean = false,
) {
  const schema = recordSchemas[table];
  if (!schema) return { success: true, data }; // Allow unvalidated tables

  const finalSchema = isUpdate ? schema.partial() : schema;
  return finalSchema.safeParse(data);
}

export function validateLogin(data: any) {
  return loginSchema.safeParse(data);
}
