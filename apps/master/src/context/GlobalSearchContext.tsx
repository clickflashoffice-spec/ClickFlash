import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

export type SearchResultType =
  | "navigation"
  | "order"
  | "client"
  | "album"
  | "photographer"
  | "action";

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: SearchResultType;
  url?: string; // For navigation
  action?: () => void; // For executable actions
  icon?: React.ReactNode;
  keywords?: string[];
  permission?: string; // Optional permission check
}

interface GlobalSearchContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  query: string;
  setQuery: (q: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(
  undefined,
);

export const GlobalSearchProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery(""); // Optional: clear query on close
  }, []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Global Shortcut: Cmd+K or Ctrl+K
  useKeyboardShortcuts("k", toggle, { metaKey: true });

  return (
    <GlobalSearchContext.Provider
      value={{
        isOpen,
        open,
        close,
        toggle,
        query,
        setQuery,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </GlobalSearchContext.Provider>
  );
};

export const useGlobalSearch = () => {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error(
      "useGlobalSearch must be used within a GlobalSearchProvider",
    );
  }
  return context;
};
