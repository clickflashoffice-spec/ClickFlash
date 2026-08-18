import { z } from 'zod';

export const userEditSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  specialty: z.string().max(100).optional().nullable().or(z.literal('')),
  role: z.string(), // Extensible since it comes from props usually
  monthlyTarget: z.number().min(0, "Monthly target cannot be negative").optional().nullable(),
  dailyPhotoTarget: z.number().min(0, "Daily target cannot be negative").int("Daily target must be an integer").optional().nullable(),
  payrollType: z.enum(['Salary', 'Commission']).optional().nullable(),
  monthlySalary: z.number().min(0).optional().nullable(),
  commissionRate: z.number().min(0).max(100, "Commission must be between 0 and 100%").optional().nullable(),
  destinationId: z.string().optional().nullable(),
  workingHours: z.any().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  password: z.string().optional(),
}).passthrough();

export const kioskEditSchema = z.object({
  name: z.string().min(1, "Kiosk name is required"),
  id: z.string().min(1, "Kiosk ID is required").regex(/^[a-zA-Z0-9_-]+$/, "ID can only contain letters, numbers, hyphens, and underscores"),
  uploadFolderPath: z.string().optional(),
  ordersFolderPath: z.string().optional()
});

export const orderItemEditSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Item name is required"),
  format: z.string().min(1, "Format is required"),
  quantity: z.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price cannot be negative"),
  deliveryType: z.enum(['print', 'digital', 'both']).optional().default('print')
});

export const orderEditSchema = z.object({
  items: z.array(orderItemEditSchema).min(1, "Order must have at least one item"),
  appliedDiscount: z.number().min(0, "Discount cannot be negative"),
  paymentMethod: z.enum(['Cash', 'Card'], {
    message: "Please select a valid payment method"
  }),
  rfidTag: z.string().optional()
});

export const createOrderSchema = orderEditSchema.extend({
  clientName: z.string().min(2, "Client name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address")
});


export const bookingEditSchema = z.object({
  clientName: z.string().min(2, "Client name must be at least 2 characters").max(100),
  clientEmail: z.string().email("Invalid email address"),
  clientPhone: z.string().min(5, "Phone number is too short").max(20).optional().or(z.literal('')),
  bookingDate: z.string().min(1, "Booking date is required"),
  bookingTime: z.string().min(1, "Booking time is required"),
  sessionId: z.string().min(1, "Session type is required"),
  photographerId: z.string().optional(),
  status: z.enum(['Pending', 'Confirmed', 'Cancelled']).default('Pending'),
  notes: z.string().optional()
});

export const photographerEditSchema = userEditSchema; // Photographers share the same schema as users currently

