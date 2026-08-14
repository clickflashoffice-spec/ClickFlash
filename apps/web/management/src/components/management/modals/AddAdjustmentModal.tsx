import React, { useState, useEffect } from "react";
import { Modal } from "@clickflash/ui";
import { Adjustment, Photographer } from "../../../types.ts";

interface AddAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (adjustment: Omit<Adjustment, "id">) => void;
  photographers: Photographer[];
  preselectedPhotographerId?: string;
}

const AddAdjustmentModal: React.FC<AddAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  photographers,
  preselectedPhotographerId,
}) => {
  const [photographerId, setPhotographerId] = useState<string>(
    preselectedPhotographerId || "",
  );
  const [amount, setAmount] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<"Bonus" | "Deduction">("Bonus");

  useEffect(() => {
    if (preselectedPhotographerId) {
      setPhotographerId(preselectedPhotographerId);
    }
  }, [preselectedPhotographerId]);

  const inputStyles =
    "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const labelStyles =
    "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photographerId || amount === "" || !description || !date) {
      alert("Please fill out all fields.");
      return;
    }

    const newAdjustment: Omit<Adjustment, "id"> = {
      date,
      photographerId,
      amount: Number(amount),
      description,
      status: "Unpaid",
      type,
    };

    onSave(newAdjustment);
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setPhotographerId(preselectedPhotographerId || "");
    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setType("Bonus");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Payroll Adjustment"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelStyles}>Photographer</label>
          <select
            value={photographerId}
            onChange={(e) => setPhotographerId(e.target.value)}
            className={inputStyles}
            required
          >
            <option value="">Select a photographer...</option>
            {photographers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "Bonus" | "Deduction")}
              className={inputStyles}
              required
            >
              <option value="Bonus">Bonus</option>
              <option value="Deduction">Deduction</option>
            </select>
          </div>
          <div>
            <label className={labelStyles}>Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="0.00"
              className={inputStyles}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelStyles}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputStyles}
            required
          />
        </div>
        <div>
          <label className={labelStyles}>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Exceeded monthly target"
            className={inputStyles}
            required
          />
        </div>
        <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleClose}
            className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Save Adjustment
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddAdjustmentModal;
