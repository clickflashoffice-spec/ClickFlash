import React, { useState, useEffect } from "react";
import Modal from "../common/Modal.tsx";
import {
  Booking,
  Photographer,
  SessionType,
  BookingStatus,
} from "../../types.ts";

interface BookingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (booking: Booking) => void;
  bookingToEdit: Booking | null;
  photographers: Photographer[];
  sessionTypes: SessionType[];
}

const BookingEditModal: React.FC<BookingEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  bookingToEdit,
  photographers,
  sessionTypes,
}) => {
  const isNew = !bookingToEdit;
  const [booking, setBooking] = useState<
    Partial<Booking & { bookingTime?: string }>
  >(bookingToEdit || { status: "Pending" as BookingStatus });

  const inputStyles =
    "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";

  useEffect(() => {
    setBooking(bookingToEdit || { status: "Pending" as BookingStatus });
  }, [bookingToEdit, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setBooking((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotographerChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = e.target.value;
    setBooking((prev) => ({
      ...prev,
      photographerId: value ? value : undefined,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(booking as Booking);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? "Add New Booking" : "Edit Booking"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            name="clientName"
            value={booking.clientName || ""}
            onChange={handleChange}
            placeholder="Client Name"
            required
            autoComplete="name"
            className={inputStyles}
          />
          <input
            type="email"
            name="email"
            value={booking.email || ""}
            onChange={handleChange}
            placeholder="Client Email"
            required
            autoComplete="email"
            className={inputStyles}
          />
        </div>
        <input
          type="tel"
          name="phone"
          value={booking.phone || ""}
          onChange={handleChange}
          placeholder="Client Phone"
          required
          autoComplete="tel"
          className={inputStyles}
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            name="bookingDate"
            value={booking.bookingDate || ""}
            onChange={handleChange}
            required
            autoComplete="off"
            className={inputStyles}
          />
          <input
            type="time"
            name="bookingTime"
            value={booking.bookingTime || ""}
            onChange={handleChange}
            required
            autoComplete="off"
            className={inputStyles}
          />
        </div>
        <select
          name="sessionTypeId"
          value={booking.sessionTypeId || ""}
          onChange={handleChange}
          required
          className={inputStyles}
        >
          <option value="">Select Session Type</option>
          {sessionTypes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-4">
          <select
            name="photographerId"
            value={booking.photographerId || ""}
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
          <select
            name="status"
            value={booking.status || "Pending"}
            onChange={handleChange}
            required
            className={inputStyles}
          >
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
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
            Save Booking
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BookingEditModal;
