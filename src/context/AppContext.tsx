import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { P2PManager, Peer, IncomingTransfer, OutgoingTransfer } from '@/lib/p2p';
import { User, getSession, setSession, clearSession } from '@/lib/session';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────
export interface ConnectionRequest {
  fromUsername: string;
  sessionId: string;
}

export interface AppState {
  user: User | null;
  peers: Map<string, Peer>;
  addedRecipients: string[];        // usernames user clicked "+"
  incomingTransfers: IncomingTransfer[];
  outgoingTransfers: OutgoingTransfer[];
  pendingRequests: ConnectionRequest[];
  transferProgress: Record<string, number>; // transferId → bytes received/sent
}

type Action =
  | { type: 'SET_USER'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_PEERS'; peers: Map<string, Peer> }
  | { type: 'ADD_RECIPIENT'; username: string }
  | { type: 'REMOVE_RECIPIENT'; username: string }
  | { type: 'INCOMING_TRANSFER_START'; transfer: IncomingTransfer }
  | { type: 'INCOMING_PROGRESS'; transferId: string; received: number }
  | { type: 'INCOMING_COMPLETE'; transfer: IncomingTransfer }
  | { type: 'OUTGOING_START';    transferId: string; name: string; size: number; peerUsername: string }
  | { type: 'OUTGOING_PROGRESS'; transferId: string; sent: number }
  | { type: 'OUTGOING_COMPLETE'; transferId: string }
  | { type: 'ADD_REQUEST'; req: ConnectionRequest }
  | { type: 'REMOVE_REQUEST'; fromUsername: string };

const initialState: AppState = {
  user: null,
  peers: new Map(),
  addedRecipients: [],
  incomingTransfers: [],
  outgoingTransfers: [],
  pendingRequests: [],
  transferProgress: {},
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.user };
    case 'LOGOUT':
      return { ...initialState };
    case 'SET_PEERS':
      return { ...state, peers: action.peers };
    case 'ADD_RECIPIENT':
      if (state.addedRecipients.includes(action.username)) return state;
      return { ...state, addedRecipients: [...state.addedRecipients, action.username] };
    case 'REMOVE_RECIPIENT':
      return { ...state, addedRecipients: state.addedRecipients.filter((u) => u !== action.username) };
    case 'INCOMING_TRANSFER_START':
      return { ...state, incomingTransfers: [action.transfer, ...state.incomingTransfers] };
    case 'INCOMING_PROGRESS': {
      const prog = { ...state.transferProgress, [action.transferId]: action.received };
      return { ...state, transferProgress: prog };
    }
    case 'INCOMING_COMPLETE': {
      const updated = state.incomingTransfers.map((t) =>
        t.transferId === action.transfer.transferId ? action.transfer : t
      );
      return { ...state, incomingTransfers: updated };
    }
    case 'OUTGOING_START': {
      const newT: OutgoingTransfer = {
        transferId: action.transferId,
        name: action.name,
        size: action.size,
        sent: 0,
        peerUsername: action.peerUsername,
        done: false,
      };
      return { ...state, outgoingTransfers: [newT, ...state.outgoingTransfers] };
    }
    case 'OUTGOING_PROGRESS': {
      const prog = { ...state.transferProgress, [action.transferId]: action.sent };
      const updated = state.outgoingTransfers.map((t) =>
        t.transferId === action.transferId ? { ...t, sent: action.sent } : t
      );
      return { ...state, outgoingTransfers: updated, transferProgress: prog };
    }
    case 'OUTGOING_COMPLETE': {
      const updated = state.outgoingTransfers.map((t) =>
        t.transferId === action.transferId ? { ...t, done: true } : t
      );
      return { ...state, outgoingTransfers: updated };
    }
    case 'ADD_REQUEST':
      if (state.pendingRequests.find((r) => r.fromUsername === action.req.fromUsername)) return state;
      return { ...state, pendingRequests: [...state.pendingRequests, action.req] };
    case 'REMOVE_REQUEST':
      return {
        ...state,
        pendingRequests: state.pendingRequests.filter((r) => r.fromUsername !== action.fromUsername),
      };
    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  p2p: P2PManager | null;
  login: (user: User) => void;
  logout: () => void;
  addRecipient: (username: string) => void;
  removeRecipient: (username: string) => void;
  acceptRequest: (fromUsername: string, sessionId: string) => void;
  rejectRequest: (fromUsername: string, sessionId: string) => void;
  sendFiles: (files: File[]) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const p2pRef = useRef<P2PManager | null>(null);

  // ── Restore session on mount ────────────────────────────────
  useEffect(() => {
    const saved = getSession();
    if (saved) {
      dispatch({ type: 'SET_USER', user: saved });
      initP2P(saved.username);
    }
  }, []);

  // ── P2P cleanup on page unload ──────────────────────────────
  useEffect(() => {
    const handler = () => p2pRef.current?.disconnect();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  function initP2P(username: string) {
    if (p2pRef.current) p2pRef.current.disconnect();
    const mgr = new P2PManager(username);

    mgr.onPeersChanged = (peers) => dispatch({ type: 'SET_PEERS', peers });

    mgr.onConnectionRequest = (fromUsername, sessionId) => {
      dispatch({ type: 'ADD_REQUEST', req: { fromUsername, sessionId } });
    };

    mgr.onRequestAccepted = (fromUsername) => {
      toast.success(`${fromUsername} accepted your request`, { description: 'Establishing connection…' });
    };

    mgr.onRequestRejected = (fromUsername) => {
      toast.error(`${fromUsername} declined your request`);
      dispatch({ type: 'REMOVE_RECIPIENT', username: fromUsername });
    };

    mgr.onIncomingTransfer = (t) => {
      dispatch({ type: 'INCOMING_TRANSFER_START', transfer: t });
    };

    mgr.onTransferProgress = (transferId, received) => {
      dispatch({ type: 'INCOMING_PROGRESS', transferId, received });
    };

    mgr.onTransferComplete = (t) => {
      dispatch({ type: 'INCOMING_COMPLETE', transfer: t });
      toast.success(`File received: ${t.name}`, { description: `From ${t.peerUsername}` });
    };

    mgr.onOutgoingStart = (transferId, name, size, peerUsername) => {
      dispatch({ type: 'OUTGOING_START', transferId, name, size, peerUsername });
    };

    mgr.onOutgoingProgress = (transferId, sent) => {
      dispatch({ type: 'OUTGOING_PROGRESS', transferId, sent });
    };

    mgr.onOutgoingComplete = (transferId) => {
      dispatch({ type: 'OUTGOING_COMPLETE', transferId });
    };

    mgr.onError = (msg) => toast.error(msg);

    mgr.connect();
    p2pRef.current = mgr;
  }

  const login = useCallback((user: User) => {
    setSession(user);
    dispatch({ type: 'SET_USER', user });
    initP2P(user.username);
  }, []);

  const logout = useCallback(() => {
    p2pRef.current?.disconnect();
    p2pRef.current = null;
    clearSession();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const addRecipient = useCallback((username: string) => {
    dispatch({ type: 'ADD_RECIPIENT', username });
    p2pRef.current?.sendRequest(username);
  }, []);

  const removeRecipient = useCallback((username: string) => {
    dispatch({ type: 'REMOVE_RECIPIENT', username });
    p2pRef.current?.removePeer(username);
  }, []);

  const acceptRequest = useCallback((fromUsername: string, sessionId: string) => {
    dispatch({ type: 'REMOVE_REQUEST', fromUsername });
    dispatch({ type: 'ADD_RECIPIENT', username: fromUsername });
    p2pRef.current?.acceptRequest(fromUsername, sessionId);
  }, []);

  const rejectRequest = useCallback((fromUsername: string, sessionId: string) => {
    dispatch({ type: 'REMOVE_REQUEST', fromUsername });
    p2pRef.current?.rejectRequest(fromUsername, sessionId);
  }, []);

  const sendFiles = useCallback(async (files: File[]) => {
    const connected = [...(state.peers.entries())]
      .filter(([, p]) => p.status === 'connected')
      .map(([username]) => username);
    if (connected.length === 0) {
      toast.error('No connected recipients', { description: 'Wait for someone to accept your request.' });
      return;
    }
    await p2pRef.current?.sendFiles(connected, files);
  }, [state.peers]);

  return (
    <AppContext.Provider
      value={{
        state,
        p2p: p2pRef.current,
        login,
        logout,
        addRecipient,
        removeRecipient,
        acceptRequest,
        rejectRequest,
        sendFiles,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
