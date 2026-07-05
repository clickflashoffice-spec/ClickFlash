import React, { useState, useEffect, useMemo } from "react";
import {
  Booking,
  Photographer,
  SessionType,
  BookingStatus,
} from "../../types.ts";
import { apiService } from "../../services/apiService.ts";
import Card from "../common/Card.tsx";
import Spinner from "../common/Spinner.tsx";
import BookingEditModal from "./BookingEditModal.tsx";
import BookingCalendar from "./BookingCalendar.tsx";
import { useDebounce } from "../../hooks/useDebounce.ts";

interface BookingsProps {
  showToast: (message: string) => void;
}

import StatCard from "../common/StatCard.tsx";

const Bookings: React.FC<BookingsProps> = ({ showToast }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookingStatus | "All" | "Unassigned">(
    "All",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [bookingsData, photographersData, sessionsData] =
          await Promise.all([
            apiService.getBookings(),
            apiService.getUsers(),
            apiService.getSessionTypes(),
          ]);
        setBookings(bookingsData);
        setPhotographers(photographersData);
        setSessionTypes(sessionsData);
      } catch (error) {
        console.error("Failed to fetch booking data", error);
        setError("Failed to load bookings. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const kpiData = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      pending: bookings.filter((b) => b.status === "Pending").length,
      unassigned: bookings.filter((b) => !b.photographerId).length,
      confirmedToday: bookings.filter(
        (b) => b.status === "Confirmed" && b.bookingDate === today,
      ).length,
      upcoming: bookings.filter(
        (b) => b.bookingDate >= today && b.status !== "Cancelled",
      ).length,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        const matchesFilter =
          filter === "All" ||
          (filter === "Unassigned" && !b.photographerId) ||
          b.status === filter;

        if (!matchesFilter) return false;

        if (debouncedSearchTerm) {
          const searchLower = debouncedSearchTerm.toLowerCase();
          return (
            b.clientName?.toLowerCase().includes(searchLower) ||
            b.email?.toLowerCase().includes(searchLower) ||
            b.bookingDate?.includes(searchLower)
          );
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by date first
        const dateCompare =
          new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
        if (dateCompare !== 0) return dateCompare;
        return 0; // Assume time stored within date, or removed
      });
  }, [bookings, filter, debouncedSearchTerm]);

  const handleQuickAssign = async (
    bookingId: string,
    photographerId: string,
  ) => {
    const bookingToUpdate = bookings.find((b) => b.id === bookingId);
    if (!bookingToUpdate) return;

    const originalBookings = [...bookings];
    const updatedBooking = {
      ...bookingToUpdate,
      photographerId,
      status: "Confirmed" as BookingStatus,
    };
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? updatedBooking : b)),
    );

    try {
      await apiService.updateBooking(bookingId, updatedBooking);
      showToast(`Booking assigned successfully.`);
    } catch {
      setBookings(originalBookings);
      showToast("Error assigning photographer.");
    }
  };

  const handleSaveBooking = async (booking: Booking) => {
    const isNew = !booking.id || !bookings.some((b) => b.id === booking.id);
    const originalBookings = [...bookings];

    // Optimistic update: update UI immediately
    if (isNew) {
      // For new bookings, create a temporary ID
      const tempBooking = {
        ...booking,
        id: booking.id || `temp-${Date.now()}`,
      };
      setBookings((prev) => [...prev, tempBooking as Booking]);
      setIsModalOpen(false);
      setBookingToEdit(null);
    } else {
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? booking : b)),
      );
      setIsModalOpen(false);
      setBookingToEdit(null);
    }

    try {
      const savedBooking = isNew
        ? await apiService.createBooking(booking as Omit<Booking, "id">)
        : await apiService.updateBooking(booking.id, booking);

      // Update with server response
      if (isNew) {
        setBookings((prev) =>
          prev.map((b) => (b.id === booking.id ? savedBooking : b)),
        );
        showToast(`Booking for ${savedBooking.clientName} created.`);
      } else {
        setBookings((prev) =>
          prev.map((b) => (b.id === savedBooking.id ? savedBooking : b)),
        );
        showToast(`Booking ${savedBooking.id} updated.`);
      }
    } catch {
      // Revert on error
      setBookings(originalBookings);
      setIsModalOpen(true);
      setBookingToEdit(booking);
      showToast("Error saving booking.");
    }
  };

  const openModal = (booking: Booking | null) => {
    setBookingToEdit(booking);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Error Loading Bookings
        </h3>
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const filterOptions: Array<BookingStatus | "All" | "Unassigned"> = [
    "All",
    "Pending",
    "Unassigned",
    "Confirmed",
    "Cancelled",
  ];

  return (
    <div className="animate-fadeIn pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Photo Session Bookings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Schedule sessions, assign photographers, and manage appointments
          </p>
        </div>
        <button
          onClick={() => openModal(null)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Booking
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <StatCard
          title="Pending"
          value={kpiData.pending}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="Unassigned"
          value={kpiData.unassigned}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          }
        />
        <StatCard
          title="Confirmed Today"
          value={kpiData.confirmedToday}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
        <StatCard
          title="Upcoming"
          value={kpiData.upcoming}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
      </div>

      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4 flex-wrap w-full md:w-auto">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white" : "text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-200"}`}
              title="List View"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${viewMode === "calendar" ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white" : "text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-200"}`}
              title="Calendar View"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>
          <div className="relative flex-grow md:flex-grow-0 md:w-64 group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-sm overflow-x-auto max-w-full">
          {filterOptions.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs md:text-sm transition-colors whitespace-nowrap ${filter === status ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white" : "text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "list" ? (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 sticky top-0 z-10">
                <tr>
                  <th className="p-4">Client</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Session Type</th>
                  <th className="p-4">Assigned To</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => {
                    const photographer = photographers.find(
                      (p) => p.id === booking.photographerId,
                    );
                    const session = sessionTypes.find(
                      (s) => s.id === booking.sessionTypeId,
                    );
                    const bookingDate = booking.bookingDate
                      ? new Date(booking.bookingDate)
                      : null;
                    const _isUpcoming = bookingDate && bookingDate >= new Date();

                    return (
                      <tr
                        key={booking.id}
                        className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => openModal(booking)}
                      >
                        <td className="p-4">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {booking.clientName || "N/A"}
                          </p>
                          {booking.email && (
                            <p
                              className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]"
                              title={booking.email}
                            >
                              {booking.email}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          {bookingDate ? (
                            <div>
                              <p className="font-medium text-sm">
                                {bookingDate.toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium">
                            {session?.name || "N/A"}
                          </span>
                        </td>
                        <td
                          className="p-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {photographer ? (
                            <div className="flex items-center space-x-2">
                              <img
                                src={
                                  photographer.avatarUrl ||
                                  "https://i.imgur.com/3Y2j2s2.png"
                                }
                                alt={photographer.name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "https://i.imgur.com/3Y2j2s2.png";
                                }}
                              />
                              <span className="text-sm">
                                {photographer.name}
                              </span>
                            </div>
                          ) : (
                            <select
                              value=""
                              onChange={(e) => {
                                e.stopPropagation();
                                handleQuickAssign(booking.id, e.target.value);
                              }}
                              aria-label="Assign photographer to this booking"
                              title="Assign photographer to this booking"
                              className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            >
                              <option value="">Assign...</option>
                              {photographers.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                              booking.status === "Confirmed"
                                ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                : booking.status === "Pending"
                                  ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                  : "bg-red-500/20 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {booking.status === "Pending" && (
                              <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></span>
                            )}
                            {booking.status}
                          </span>
                        </td>
                        <td
                          className="p-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => openModal(booking)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 w-20 h-20 mb-4 flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-10 w-10 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                          {debouncedSearchTerm
                            ? "No Bookings Found"
                            : filter !== "All"
                              ? `No ${filter} Bookings`
                              : "No Bookings Yet"}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                          {debouncedSearchTerm
                            ? `No bookings match "${debouncedSearchTerm}". Try adjusting your search.`
                            : filter !== "All"
                              ? `There are no ${filter.toLowerCase()} bookings at the moment.`
                              : "Get started by creating your first booking using the 'Add Booking' button above."}
                        </p>
                        {!debouncedSearchTerm && filter === "All" && (
                          <button
                            onClick={() => openModal(null)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 inline-flex items-center gap-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                            Create First Booking
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <BookingCalendar
          bookings={filteredBookings}
          photographers={photographers}
          sessionTypes={sessionTypes}
          onBookingClick={openModal}
        />
      )}

      {isModalOpen && (
        <BookingEditModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setBookingToEdit(null);
          }}
          onSave={handleSaveBooking}
          bookingToEdit={bookingToEdit}
          photographers={photographers}
          sessionTypes={sessionTypes}
        />
      )}
    </div>
  );
};

export default Bookings;
