import React, { createContext, useContext, useState, useEffect } from "react";

interface Station {
  id: string;
  name: string;
  location: string;
}

interface StationContextType {
  selectedStationId: string | null; // null means 'Global'
  setSelectedStationId: (id: string | null) => void;
  stations: Station[];
  loading: boolean;
}

const StationContext = createContext<StationContextType | undefined>(undefined);

export const StationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    null,
  );
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        // Fetch from the fleet endpoint which lists Masters
        const response = await fetch(
          `${(window as unknown as { pb?: { baseUrlValue?: string; authStore?: { token?: string } } }).pb?.baseUrlValue}/api/cloud/fleet`,
          {
            headers: {
              Authorization: `Bearer ${(window as unknown as { pb?: { baseUrlValue?: string; authStore?: { token?: string } } }).pb?.authStore?.token}`,
            },
          },
        );
        const data = await response.json();
        if (data.success && data.fleet) {
          setStations(
            data.fleet.map((s: Record<string, unknown>) => ({
              id: s.id,
              name: s.name,
              location: s.location,
            })),
          );
        }
      } catch (error) {
        console.error("Failed to fetch stations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, []);

  return (
    <StationContext.Provider
      value={{ selectedStationId, setSelectedStationId, stations, loading }}
    >
      {children}
    </StationContext.Provider>
  );
};

export const useStation = () => {
  const context = useContext(StationContext);
  if (context === undefined) {
    throw new Error("useStation must be used within a StationProvider");
  }
  return context;
};
