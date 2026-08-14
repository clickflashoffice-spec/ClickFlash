export * from "@clickflash/types";

export type Transaction = any;
export type JobStatus = any;
export type ProjectStatus = any;
export type ExpenseCategory = any;
export type EquipmentCategory = any;
export interface ShootIdea {
  title: string;
  description: string;
  settings: {
    aperture: string;
    shutter_speed: string;
    iso: string;
  };
}

export type PhotoCategory = string;
export type Photographer = any;
export type View = any;
export type DestinationFeatures = any;
export type Permission = string;
export type DailyObjective = any;
export type LoginHistory = any;
export type FileSystemItem = any;
export type Booking = any;
export type Expense = any;
export type Loan = any;
export type Adjustment = any;
export type Equipment = any;
export type AppRole = string;
