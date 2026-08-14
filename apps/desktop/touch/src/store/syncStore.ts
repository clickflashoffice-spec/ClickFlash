import { create } from 'zustand';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface SyncState {
  connected: boolean;
  activeSessionId: string | null;
  setActiveSession: (id: string | null) => void;
  doc: Y.Doc;
}

const doc = new Y.Doc();
// Use window.location to build WS URL dynamically, pointing to Master's port (8090)
const wsUrl = typeof window !== 'undefined' 
  ? `ws://${window.location.hostname}:8090/yjs`
  : 'ws://127.0.0.1:8090/yjs';

// The document name determines the synchronization room
const provider = new WebsocketProvider(wsUrl, 'touch-kiosks', doc);

const sessionMap = doc.getMap('session');

export const useSyncStore = create<SyncState>((set) => {
  // Sync from Yjs -> Zustand
  sessionMap.observe((event) => {
    if (event.keysChanged.has('activeSessionId')) {
      set({ activeSessionId: sessionMap.get('activeSessionId') as string | null });
    }
  });

  provider.on('status', (event: { status: 'connected' | 'disconnected' | 'connecting' }) => {
    set({ connected: event.status === 'connected' });
  });

  return {
    connected: false,
    activeSessionId: sessionMap.get('activeSessionId') as string | null || null,
    doc,
    
    // Sync from Zustand -> Yjs
    setActiveSession: (id: string | null) => {
      // Modifying the Yjs map will trigger the observer above for other clients
      sessionMap.set('activeSessionId', id);
      set({ activeSessionId: id });
    }
  };
});
