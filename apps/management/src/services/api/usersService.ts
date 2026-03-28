/**
 * Users/Photographers Service
 * Handles all user-related CRUD operations
 */

import { pb } from "../pb";
import { Photographer } from "../../types";

export const usersService = {
  async getUsers(): Promise<Photographer[]> {
    const records = await pb.collection("users").getFullList();
    return records.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      password: r.password,
      role: r.role,
      specialty: r.specialty,
      avatarUrl: r.avatarUrl,
      monthlyTarget: r.monthlyTarget,
      dailyPhotoTarget: r.dailyPhotoTarget,
      payrollType: r.payrollType,
      monthlySalary: r.monthlySalary,
      commissionRate: r.commissionRate,
      destinationId: r.destinationId,
      workingHours: r.workingHours,
    }));
  },

  async createUser(data: Partial<Photographer>): Promise<Photographer> {
    const record = await pb.collection("users").create(data);
    return record as Photographer;
  },

  async updateUser(
    id: string | number,
    data: Partial<Photographer>,
  ): Promise<Photographer> {
    const record = await pb.collection("users").update(String(id), data);
    return record as Photographer;
  },

  async deleteUser(id: string | number): Promise<void> {
    await pb.collection("users").delete(String(id));
  },

  async getUserById(id: string): Promise<Photographer | null> {
    try {
      const record = await pb.collection("users").getOne(id);
      return record as Photographer;
    } catch {
      return null;
    }
  },

  async getPhotographersByDestination(destinationId: string): Promise<Photographer[]> {
    const records = await pb.collection("users").getList(1, 500, {
      filter: `destinationId = "${destinationId}"`,
    });
    return records.items as Photographer[];
  },
};