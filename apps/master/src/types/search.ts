import { Album, Order, Photographer } from './shared';

export type SearchResultType = 'Album' | 'Order' | 'Photographer' | 'Action';

export interface SearchResultItem {
    id: string;
    type: SearchResultType;
    title: string;
    subtitle?: string;
    metadata?: any;
    original?: Album | Order | Photographer | QuickAction;
    icon?: string;
}

export interface QuickAction {
    id: string;
    label: string;
    icon: string;
    action: () => void | Promise<void>;
    shortcut?: string;
}

export interface SearchState {
    query: string;
    results: SearchResultItem[];
    isLoading: boolean;
    selectedIndex: number;
}
