export * from "./types/shared";

// Management specific types that were purged from shared.ts
export type BookingStatus = "Pending" | "Confirmed" | "Cancelled";

export type PhotoCategory =
  | "Uncategorized"
  | "Portrait"
  | "Landscape"
  | "Action"
  | "Candid"
  | "Product"
  | "Architecure";

export interface CartItem {
  id: string; // Product id
  name: string;
  price: number;
  quantity: number;
  type?: "photo" | "product";
  photoId?: string; // If it's a specific photo being bought
  format?: string; // e.g., 'digital', 'print 4x6'
}

export interface ShootIdea {
  id: string;
  title: string;
  description: string;
  tags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  equipmentNeeded: string[];
}

export interface EcommerceExtension {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  icon: string;
  config?: Record<string, any>;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  date: string;
  amount: number;
  notes?: string;
}
