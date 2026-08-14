import React, { useState, useEffect } from "react";
import { Modal } from "@clickflash/ui";
import {
  Equipment,
  Photographer,
  EquipmentStatus,
  EquipmentCategory,
} from "../../../types";
import { MOCK_DESTINATIONS } from "../../../constants";

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (equipment: Omit<Equipment, "id"> | Equipment) => void;
  equipmentToEdit: Equipment | null;
  photographers: Photographer[];
  equipmentCategories: EquipmentCategory[];
}

const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  "Available",
  "In Use",
  "In Storage",
  "Needs Repair",
];

const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  equipmentToEdit,
  photographers,
  equipmentCategories,
}) => {
  const isNew = !equipmentToEdit;
  const [equipment, setEquipment] = useState<Partial<Equipment>>(
    equipmentToEdit || {
      name: "",
      type: equipmentCategories[0]?.id || "",
      status: "Available",
    },
  );

  const inputStyles =
    "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const labelStyles =
    "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";

  useEffect(() => {
    if (isOpen) {
      setEquipment(
        equipmentToEdit || {
          name: "",
          type: equipmentCategories[0]?.id || "",
          status: "Available",
        },
      );
    }
  }, [equipmentToEdit, isOpen, equipmentCategories]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setEquipment((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotographerChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = e.target.value;
    setEquipment((prev) => ({
      ...prev,
      assignedToPhotographerId: value || undefined,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(equipment as Equipment);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? "Add Equipment" : "Edit Equipment"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelStyles}>Equipment Name</label>
          <input
            type="text"
            name="name"
            value={equipment.name || ""}
            onChange={handleChange}
            required
            className={inputStyles}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Type</label>
            <select
              name="type"
              value={equipment.type}
              onChange={handleChange}
              required
              className={inputStyles}
            >
              {equipmentCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelStyles}>Status</label>
            <select
              name="status"
              value={equipment.status}
              onChange={handleChange}
              required
              className={inputStyles}
            >
              {EQUIPMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Destination</label>
            <select
              name="destinationId"
              value={equipment.destinationId || ""}
              onChange={handleChange}
              className={inputStyles}
            >
              <option value="">Company-wide</option>
              {MOCK_DESTINATIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelStyles}>Assigned To</label>
            <select
              value={equipment.assignedToPhotographerId || ""}
              onChange={handlePhotographerChange}
              className={inputStyles}
            >
              <option value="">Unassigned</option>
              {photographers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Save Equipment
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddEquipmentModal;
