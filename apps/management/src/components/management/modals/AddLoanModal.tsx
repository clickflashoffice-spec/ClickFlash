import React, { useState, useEffect } from "react";
import { Modal } from "@clickflash/ui";
import { Loan } from "../../../types.ts";
import { MOCK_DESTINATIONS } from "../../../constants.ts";

interface AddLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loan: Omit<Loan, "id">) => void;
}

const AddLoanModal: React.FC<AddLoanModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [interestRate, setInterestRate] = useState<number | "">("");
  const [destinationId, setDestinationId] = useState<string | undefined>(
    undefined,
  );

  const inputStyles =
    "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || amount === "" || !date) {
      alert("Please fill out required fields.");
      return;
    }

    const newLoan: Omit<Loan, "id"> = {
      date,
      source,
      amount: Number(amount),
      interestRate: Number(interestRate || 0) / 100,
      status: "Active",
      destinationId,
      payments: [],
    } as any;

    onSave(newLoan);
    onClose();
  };

  // Reset form state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSource("");
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setInterestRate("");
      setDestinationId(undefined);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Loan or Capital">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Loan Source (e.g., Bank Loan)"
          autoComplete="off"
          className={inputStyles}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            autoComplete="off"
            className={inputStyles}
            required
          />
          <input
            type="number"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="Amount"
            autoComplete="off"
            className={inputStyles}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            step="0.01"
            value={interestRate}
            onChange={(e) =>
              setInterestRate(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            placeholder="Interest Rate (%)"
            autoComplete="off"
            className={inputStyles}
          />
          <select
            value={destinationId || ""}
            onChange={(e) => setDestinationId(e.target.value || undefined)}
            className={inputStyles}
          >
            <option value="">Company-wide (No Destination)</option>
            {MOCK_DESTINATIONS.map((dest) => (
              <option key={dest.id} value={dest.id}>
                {dest.name}
              </option>
            ))}
          </select>
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
            Save Loan
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddLoanModal;
