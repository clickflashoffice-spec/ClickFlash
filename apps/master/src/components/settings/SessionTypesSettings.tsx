import React, { useState, useEffect } from "react";
import { SessionType } from "../../types.ts";
import { apiService } from "../../services/apiService.ts";
import Spinner from "../common/Spinner.tsx";
import { useCurrency } from "../CurrencyContext.tsx";
import SessionTypeEditModal from "../modals/SessionTypeEditModal.tsx";
import Card from "../common/Card.tsx";
import { logger } from '@/utils/logger';

const SessionTypesSettings: React.FC = () => {
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
    <Card>
      <div className="p-4 mb-6 bg-blue-500/10 border-l-4 border-blue-500 rounded-r-lg">
        <p className="text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> These are global settings that can be managed
          from the Management Portal. Any changes made here may be overwritten
          during a cloud sync. It is recommended to manage session types
          centrally.
        </p>
      </div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Manage Session Types</h2>
        <button
          onClick={() => handleOpenModal(null)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          Add Session Type
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Number of Photos</th>
              <th className="p-4 text-right">Price</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessionTypes.length > 0 ? (
              sessionTypes.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-200 dark:border-slate-700/50"
                >
                  <td className="p-4 font-semibold">{s.name}</td>
                  <td className="p-4">{s.numberOfPhotos} photos</td>
                  <td className="p-4 text-right font-mono">
                    {formatCurrency(s.price)}
                  </td>
                  <td className="p-4 text-center space-x-4">
                    <button
                      onClick={() => handleOpenModal(s)}
                      className="text-blue-500 hover:text-blue-400 font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id, s.name)}
                      className="text-red-500 hover:text-red-400 font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-12 text-center text-slate-500">
                  No session types configured. Add your first session type to
                  get started.
                </td>
              </tr>
            )}
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
    </Card>
  );
};

export default SessionTypesSettings;
