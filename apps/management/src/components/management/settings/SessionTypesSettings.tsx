import React, { useState, useEffect } from "react";
import { SessionType } from "../../../types";
import { apiService } from "../../../services/apiService";
import { Spinner } from "@clickflash/ui";
import { useCurrency } from "../../CurrencyContext";
import SessionTypeEditModal from "../modals/SessionTypeEditModal";
import { logger } from "@/utils/logger";

interface SessionTypesSettingsProps {
  context?: string;
}

const SessionTypesSettings: React.FC<SessionTypesSettingsProps> = ({
  context: context,
}) => {
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<SessionType | null>(null);
  const { formatCurrency } = useCurrency();

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getSessionTypes();
      setSessionTypes(data);
    } catch (error) {
      logger.error("Failed to load session types", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (session: SessionType | null) => {
    setSessionToEdit(session);
    setIsModalOpen(true);
  };

  const handleSave = async (session: Omit<SessionType, "id"> | SessionType) => {
    try {
      // Ensure number fields are properly converted
      const sessionData = {
        ...session,
        numberOfPhotos: Number(session.numberOfPhotos),
        price: Number(session.price),
      };

      if ("id" in session) {
        await apiService.updateSessionType(session.id, sessionData);
      } else {
        await apiService.createSessionType(
          sessionData as Omit<SessionType, "id">,
        );
      }
      setIsModalOpen(false);
      setSessionToEdit(null);
      fetchData();
    } catch (error) {
      logger.error("Failed to save session type", error);
      alert(
        `Failed to save session type: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the session type "${name}"?`,
      )
    ) {
      await apiService.deleteSessionType(id);
      fetchData();
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
          Session <span className="text-cyan-600">Templates</span>
        </h2>
        <button
          onClick={() => handleOpenModal(null)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 px-6 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
        >
          Add Session Type
        </button>
      </div>
      <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-2xl">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Number of Photos</th>
              <th className="p-4 text-right">Price</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessionTypes.map((s) => (
              <tr
                key={s.id}
                className="border-b border-slate-200 dark:border-slate-700"
              >
                <td className="p-4 font-semibold text-slate-900 dark:text-white">
                  {s.name}
                </td>
                <td className="p-4 text-slate-700 dark:text-slate-300">
                  {s.numberOfPhotos} photos
                </td>
                <td className="p-4 text-right font-mono">
                  {formatCurrency(s.price)}
                </td>
                <td className="p-4 text-center space-x-4">
                  <button
                    onClick={() => handleOpenModal(s)}
                    className="text-cyan-600 hover:text-cyan-500 font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    className="text-red-500 hover:text-red-400 font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <SessionTypeEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          sessionToEdit={sessionToEdit}
        />
      )}
    </div>
  );
};

export default SessionTypesSettings;
