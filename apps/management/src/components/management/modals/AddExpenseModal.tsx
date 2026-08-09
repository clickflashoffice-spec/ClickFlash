import React, { useState, useEffect } from "react";
import { Modal } from "@clickflash/ui";
import {
  Expense,
  Photographer,
  Destination,
  ExpenseCategory,
} from "../../../types.ts";
import { apiService } from "../../../services/apiService.ts";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<Expense, "id">) => void;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState<number | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<string>("");
  const [destinationId, setDestinationId] = useState("");
  const [photographerId, setPhotographerIds] = useState<string[]>([]);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    [],
  );

  const inputStyles =
    "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const labelStyles =
    "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        const [users, dests, cats] = await Promise.all([
          apiService.getUsers(),
          apiService.getDestinations(),
          apiService.getExpenseCategories(),
        ]);
        setPhotographers(users);
        setDestinations(dests);
        setExpenseCategories(cats);
        if (dests.length > 0) setDestinationId(dests[0].id);
        if (cats.length > 0) setCategory(cats[0].id);
      };
      fetchData();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || cost === "" || !date || !category || !destinationId) {
      alert("Please fill out all fields.");
      return;
    }

    const newExpense: Omit<Expense, "id"> = {
      date,
      description,
      category,
      cost: Number(cost),
      destinationId,
      photographerId: photographerId.length > 0 ? photographerId : undefined,
      invoiceUrl: invoiceFile ? "#" : undefined,
    } as any;

    onSave(newExpense);
    // Reset form
    setDescription("");
    setCost("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Expense" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              autoComplete="off"
              className={inputStyles}
              required
            />
          </div>
          <div>
            <label className={labelStyles}>Cost</label>
            <input
              type="number"
              value={cost}
              onChange={(e) =>
                setCost(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="0.00"
              autoComplete="off"
              className={inputStyles}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelStyles}>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., New camera lens"
            autoComplete="off"
            className={inputStyles}
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Destination</label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className={inputStyles}
              required
            >
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelStyles}>
              Assign to Photographers (Optionally max 10 for shared expenses)
            </label>
            <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md border border-slate-200 dark:border-slate-600">
              {photographers.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={photographerId.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (photographerId.length < 10) {
                          setPhotographerIds([...photographerId, p.id]);
                        }
                      } else {
                        setPhotographerIds(
                          photographerId.filter((id) => id !== p.id),
                        );
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>{p.name}</span>
                </label>
              ))}
              {photographers.length === 0 && (
                <span className="text-slate-500 text-sm">
                  No photographers found.
                </span>
              )}
            </div>
            {photographerId.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {photographerId.length} photographer(s) selected
              </p>
            )}
          </div>
        </div>
        <div>
          <label className={labelStyles}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputStyles}
            required
          >
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelStyles}>Upload Invoice (Optional)</label>
          <input
            type="file"
            onChange={(e) =>
              setInvoiceFile(e.target.files ? e.target.files[0] : null)
            }
            className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-200 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-300 dark:hover:file:bg-slate-600"
          />
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
            Save Expense
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddExpenseModal;
