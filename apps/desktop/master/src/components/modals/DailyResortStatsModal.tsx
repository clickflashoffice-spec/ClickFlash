import { Modal, Button, Input } from "@clickflash/ui";
import React, { useState } from "react";

import { logger } from "../../utils/logger";

interface DailyResortStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stats: {
    guests: number;
    departures: number;
    viewing_sessions: number;
  }) => Promise<void>;
}

const DailyResortStatsModal: React.FC<DailyResortStatsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [guests, setGuests] = useState<number>(0);
  const [departures, setDepartures] = useState<number>(0);
  const [viewingSessions, setViewingSessions] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        guests,
        departures,
        viewing_sessions: viewingSessions,
      });
      logger.info("Daily resort stats saved successfully");
      onClose();
    } catch (error) {
      logger.error("Failed to save daily resort stats", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Daily Resort Operations Stats"
      size="md"
    >
      <div className="space-y-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter the daily operational metrics for the property. These numbers
          are used to calculate conversion rates and property performance.
        </p>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">New Guest Arrivals</label>
            <Input
              type="number"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value) || 0)}
              placeholder="Total new guests today"
              min={0}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Guest Departures</label>
            <Input
              type="number"
              value={departures}
              onChange={(e) => setDepartures(parseInt(e.target.value) || 0)}
              placeholder="Total departures today"
              min={0}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Viewing Sessions (Manual Entry)
            </label>
            <Input
              type="number"
              value={viewingSessions}
              onChange={(e) =>
                setViewingSessions(parseInt(e.target.value) || 0)
              }
              placeholder="Manual viewing session override"
              min={0}
            />
            <p className="text-xs text-slate-400 font-italic">
              * The system auto-tracks viewing events, but you can override it
              here.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Daily Stats"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DailyResortStatsModal;
