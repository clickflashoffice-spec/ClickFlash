import { z } from 'zod';

export const userEditSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  specialty: z.string().min(2, "Specialty is required").max(100),
  role: z.string(), // Extensible since it comes from props usually
  monthlyTarget: z.number().min(0, "Monthly target cannot be negative"),
  dailyPhotoTarget: z.number().min(0, "Daily target cannot be negative").int("Daily target must be an integer"),
  payrollType: z.enum(['Salary', 'Commission']),
  monthlySalary: z.number().min(0).optional(),
  commissionRate: z.number().min(0).max(1, "Commission must be between 0 and 100%").optional(),
});

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
  paymentMethod: z.enum(['Cash', 'Card']).optional().default('Cash'),
  rfidTag: z.string().optional()
});
