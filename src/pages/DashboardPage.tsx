import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Upload, Download, CheckSquare, Square, Shield,
  Wifi, LogOut, FileText, Image, Video, Music, Archive,
  Code, File, CheckCircle, Clock, Send, MessageCircle,
  Bell, User as UserIcon, Lock, Trash2, Monitor, Smartphone, RefreshCw,
  KeyRound, Eye, EyeOff, AlertTriangle, Users
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { searchUsers, getDeviceSessions, removeDeviceSession, updatePassword, type DeviceSession } from '@/lib/auth';
import { getSession, getOrCreateSessionToken } from '@/lib/session';
import { fmtBytes, fmtSpeed, fmtEta, fileIconKind, isImage } from '@/lib/fileUtils';
import type { IncomingTransfer, OutgoingTransfer } from '@/lib/p2p';
import { toast } from 'sonner';

type MobileTab = 'people' | 'send' | 'chat' | 'received';

// ── Top-level guard ──────────────────────────────────────────
export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { state, logout, clearLoginAlerts } = useApp();
  const [showLoginInfo, setShowLoginInfo] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('send');

  useEffect(() => {
    if (!getSession()) setLocation('/');
  }, [setLocation]);

  // Auto-switch to Received tab when file arrives on mobile
  const prevIncoming = useRef(state.incomingTransfers.length);
  useEffect(() => {
    if (state.incomingTransfers.length > prevIncoming.current) {
      setMobileTab('received');
    }
    prevIncoming.current = state.incomingTransfers.length;
  }, [state.incomingTransfers.length]);

  function handleLogout() {
    logout();
    setLocation('/');
  }

  if (!state.user) return null;

  const alertCount = state.newLoginAlerts.length;
  const completedCount = state.incomingTransfers.filter((t) => t.url).length;
  const unreadChat = mobileTab !== 'chat' && state.chatMessages.length > 0;

  return (
    <div className="oreopie-bg min-h-screen flex flex-col">
      {/* Background blobs */}
      <div className="blob w-[600px] h-[600px] top-[-150px] right-[-150px]"
        style={{ background: 'rgba(8,59,58,0.08)' }} />
      <div className="blob w-[400px] h-[400px] bottom-[-100px] left-[-100px]"
        style={{ background: 'rgba(109,0,26,0.07)' }} />
      <div className="blob w-[350px] h-[350px] top-[35%] left-[40%]"
        style={{ background: 'rgba(138,78,42,0.06)' }} />

      {/* ── Header ── */}
      <header className="relative z-10 glass-subtle border-b border-[#CDB49E]/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-lg font-bold text-[#111111] tracking-wide">OreoPie</h1>
          <Shield size={12} className="text-[#083B3A] hidden sm:block" />
        </div>

        <div className="flex items-center gap-1">
          {/* New login alert bell */}
          <div className="relative">
            <button
              onClick={() => { setShowAlerts(!showAlerts); if (alertCount > 0) clearLoginAlerts(); }}
              className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#083B3A]/8 transition-all"
              title="Login alerts"
            >
              <Bell size={15} className="text-[#8A4E2A]" />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#6D001A] text-white text-[9px] font-bold flex items-center justify-center">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showAlerts && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute right-0 top-10 w-64 glass rounded-xl border border-[#CDB49E]/40 shadow-lg z-50 overflow-hidden"
                >
                  <div className="px-3 py-2.5 border-b border-[#CDB49E]/20">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#8A4E2A]">Login Alerts</p>
                  </div>
                  {state.newLoginAlerts.length === 0 ? (
                    <p className="px-4 py-4 font-mono text-xs text-[#CDB49E] text-center">No recent alerts</p>
                  ) : (
                    state.newLoginAlerts.slice().reverse().map((alert, i) => (
                      <div key={i} className="px-3 py-2.5 border-b border-[#CDB49E]/15 last:border-0">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={12} className="text-[#6D001A] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-mono text-xs text-[#111111] font-medium">{alert.deviceLabel}</p>
                            <p className="font-mono text-[10px] text-[#8A4E2A]">
                              {new Date(alert.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Username / Login Info button */}
          <button
            onClick={() => setShowLoginInfo(true)}
            className="flex items-center gap-1.5 text-xs text-[#8A4E2A] hover:text-[#111111] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#083B3A]/8 border border-transparent hover:border-[#CDB49E]/30"
          >
            <UserIcon size={13} />
            {/* Show username only on sm+ */}
            <span className="font-mono font-bold text-[#111111] hidden sm:inline">{state.user.username}</span>
          </button>

          <button
            onClick={handleLogout}
            data-testid="button-logout"
            className="flex items-center gap-1.5 text-xs text-[#8A4E2A] hover:text-[#6D001A] transition-colors p-1.5 rounded-lg hover:bg-[#6D001A]/8"
            title="Sign out"
          >
            <LogOut size={14} />
            <span className="font-mono hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Connection Requests */}
      <AnimatePresence>
        {state.pendingRequests.map((req) => (
          <RequestBanner key={req.fromUsername} req={req} />
        ))}
      </AnimatePresence>

      {/* ── Main layout ── */}
      <div className="relative z-10 flex flex-1 overflow-hidden">

        {/* Left panel — Recipients — desktop only */}
        <aside className="hidden md:flex flex-col w-80 border-r border-[#CDB49E]/25 bg-white/20 backdrop-blur-sm flex-shrink-0">
          <RecipientsPanel />
        </aside>

        {/* Right panel — Transfer + Chat — desktop always, mobile when tab ≠ 'people' */}
        <main className={`flex-1 flex-col overflow-hidden ${mobileTab === 'people' ? 'hidden md:flex' : 'flex'}`}>
          <TransferPanel mobileTab={mobileTab} />
        </main>

        {/* Mobile — People panel (full screen when tab = 'people') */}
        <div className={`md:hidden absolute inset-0 z-10 bg-transparent flex flex-col ${mobileTab === 'people' ? 'flex' : 'hidden'}`}>
          <div className="flex-1 overflow-hidden flex flex-col bg-white/20 backdrop-blur-sm">
            <RecipientsPanel />
          </div>
        </div>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden flex-shrink-0 glass-subtle border-t border-[#CDB49E]/30 z-20">
        <div className="flex items-stretch h-16">
          <MobileNavBtn
            label="People"
            icon={<Users size={18} />}
            active={mobileTab === 'people'}
            onClick={() => setMobileTab('people')}
          />
          <MobileNavBtn
            label="Send"
            icon={<Upload size={18} />}
            active={mobileTab === 'send'}
            onClick={() => setMobileTab('send')}
          />
          <MobileNavBtn
            label="Chat"
            icon={<MessageCircle size={18} />}
            active={mobileTab === 'chat'}
            onClick={() => setMobileTab('chat')}
            badge={unreadChat}
          />
          <MobileNavBtn
            label="Received"
            icon={<Download size={18} />}
            active={mobileTab === 'received'}
            onClick={() => setMobileTab('received')}
            count={completedCount > 0 ? completedCount : undefined}
          />
        </div>
      </nav>

      {/* Login Info Modal */}
      <AnimatePresence>
        {showLoginInfo && (
          <LoginInfoModal user={state.user} onClose={() => setShowLoginInfo(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Mobile bottom nav button ─────────────────────────────────
function MobileNavBtn({
  label, icon, active, onClick, badge, count,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  badge?: boolean;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-1 relative transition-all ${
        active ? 'text-[#083B3A]' : 'text-[#8A4E2A]/70'
      }`}
    >
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-[#083B3A]" />
      )}
      <span className="relative">
        {icon}
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#6D001A]" />
        )}
        {count !== undefined && count > 0 && (
          <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-[#083B3A] text-white text-[8px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </span>
      <span className="font-mono text-[9px] font-medium">{label}</span>
    </button>
  );
}

// ── Connection request banner ────────────────────────────────
function RequestBanner({ req }: { req: { fromUsername: string; sessionId: string } }) {
  const { acceptRequest, rejectRequest } = useApp();
  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      className="relative z-20 mx-3 mt-2 glass rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 border border-[#083B3A]/20"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-[#083B3A] flex items-center justify-center flex-shrink-0">
          <span className="font-display text-[9px] font-bold text-white">
            {req.fromUsername.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#111111] truncate">
            <span className="font-bold">{req.fromUsername}</span> wants to connect
          </p>
          <p className="font-mono text-[9px] text-[#8A4E2A]">Encrypted session</p>
        </div>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <button
          onClick={() => acceptRequest(req.fromUsername, req.sessionId)}
          data-testid={`button-accept-${req.fromUsername}`}
          className="px-2.5 py-1 rounded-lg bg-[#083B3A] text-white text-xs font-semibold hover:bg-[#0a4a49] transition-all"
        >
          Accept
        </button>
        <button
          onClick={() => rejectRequest(req.fromUsername, req.sessionId)}
          data-testid={`button-reject-${req.fromUsername}`}
          className="px-2.5 py-1 rounded-lg bg-[#6D001A]/10 text-[#6D001A] text-xs font-semibold border border-[#6D001A]/20 hover:bg-[#6D001A]/15 transition-all"
        >
          Decline
        </button>
      </div>
    </motion.div>
  );
}

// ── Recipients Panel ─────────────────────────────────────────
function RecipientsPanel() {
  const { state, addRecipient, removeRecipient } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      const found = await searchUsers(q, state.user?.username ?? '');
      setResults(found.filter((u) => !state.addedRecipients.includes(u)));
      setSearching(false);
    }, 300);
  }, [state.user?.username, state.addedRecipients]);

  function handleAdd(username: string) {
    addRecipient(username);
    setResults([]);
    setQuery('');
  }

  const connectedCount = [...state.peers.values()].filter((p) => p.status === 'connected').length;

  return (
    <>
      <div className="p-3 border-b border-[#CDB49E]/20">
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#8A4E2A]">
            Send To
          </span>
          <span className="font-mono text-[10px] text-[#083B3A]">
            {connectedCount} connected
          </span>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CDB49E]" />
          <input
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search username…"
            data-testid="input-search-users"
            className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm bg-white/60 border border-[#CDB49E]/50
              focus:border-[#083B3A] focus:ring-1 focus:ring-[#083B3A]/15 outline-none transition-all font-mono"
          />
        </div>

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-2 glass rounded-xl overflow-hidden border-[#CDB49E]/40"
            >
              {results.map((u) => (
                <div
                  key={u}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/40 transition-colors border-b border-[#CDB49E]/15 last:border-0"
                >
                  <Avatar username={u} size="sm" />
                  <span className="flex-1 font-mono text-xs text-[#111111] font-medium">{u}</span>
                  <button
                    onClick={() => handleAdd(u)}
                    data-testid={`button-add-${u}`}
                    className="w-6 h-6 rounded-lg bg-[#083B3A] flex items-center justify-center hover:bg-[#0a4a49] transition-all"
                  >
                    <Plus size={12} className="text-white" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
          {searching && query.length >= 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-2 px-3 py-2 font-mono text-[11px] text-[#8A4E2A] text-center">
              Searching…
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {state.addedRecipients.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Wifi size={28} className="text-[#CDB49E] mx-auto" />
            <p className="font-mono text-xs text-[#8A4E2A]">Search a username above</p>
            <p className="font-mono text-[10px] text-[#CDB49E]">to invite them to this session</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {state.addedRecipients.map((username, i) => {
              const peer = state.peers.get(username);
              const status = peer?.status ?? 'pending';
              return (
                <motion.div
                  key={username}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2.5 p-2.5 glass rounded-xl"
                  data-testid={`recipient-${username}`}
                >
                  <div className="relative">
                    <Avatar username={username} size="sm" teal={status === 'connected'} />
                    <StatusDot status={status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-bold text-[#111111] truncate">{username}</p>
                    <p className={`font-mono text-[10px] ${
                      status === 'connected' ? 'text-[#083B3A]' :
                      status === 'failed' ? 'text-[#6D001A]' : 'text-[#8A4E2A]'
                    } ${status === 'connecting' ? 'status-connecting' : ''}`}>
                      {status === 'connected' ? 'Connected' :
                       status === 'connecting' ? 'Connecting…' :
                       status === 'pending' ? 'Request sent' :
                       status === 'failed' ? 'Failed' : 'Disconnected'}
                    </p>
                  </div>
                  <button
                    onClick={() => removeRecipient(username)}
                    data-testid={`button-remove-${username}`}
                    className="w-6 h-6 rounded-lg hover:bg-[#6D001A]/10 transition-all flex items-center justify-center text-[#CDB49E] hover:text-[#6D001A]"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </>
  );
}

// ── Transfer Panel (with Chat tab) ───────────────────────────
function TransferPanel({ mobileTab }: { mobileTab: MobileTab }) {
  // On desktop, keep internal tab state; on mobile, mobileTab drives the content
  const [desktopTab, setDesktopTab] = useState<'send' | 'chat' | 'received'>('send');
  const { state } = useApp();

  // Sync desktop tab when incoming files arrive
  const prevIncoming = useRef(state.incomingTransfers.length);
  useEffect(() => {
    if (state.incomingTransfers.length > prevIncoming.current) {
      setDesktopTab('received');
    }
    prevIncoming.current = state.incomingTransfers.length;
  }, [state.incomingTransfers.length]);

  const completedCount = state.incomingTransfers.filter((t) => t.url).length;
  const unreadChat = desktopTab !== 'chat' && state.chatMessages.length > 0;

  // Resolve the active tab
  // On mobile (mobileTab ≠ 'people'), use mobileTab; on desktop, use desktopTab
  const isMobileView = mobileTab !== 'people';
  const activeTab: 'send' | 'chat' | 'received' = isMobileView
    ? (mobileTab as 'send' | 'chat' | 'received')
    : desktopTab;

  return (
    <div className="flex flex-col flex-1 overflow-hidden p-3 md:p-5 gap-3 md:gap-4">
      {/* Tabs — desktop only (mobile uses bottom nav) */}
      <div className="hidden md:flex gap-1 p-1 glass rounded-xl w-fit">
        <button
          onClick={() => setDesktopTab('send')}
          data-testid="tab-send"
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            desktopTab === 'send'
              ? 'bg-[#083B3A] text-white shadow-sm'
              : 'text-[#8A4E2A] hover:text-[#111111] hover:bg-white/40'
          }`}
        >
          Send Files
        </button>

        <button
          onClick={() => setDesktopTab('chat')}
          data-testid="tab-chat"
          className={`relative px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            desktopTab === 'chat'
              ? 'bg-[#083B3A] text-white shadow-sm'
              : 'text-[#8A4E2A] hover:text-[#111111] hover:bg-white/40'
          }`}
        >
          <MessageCircle size={12} />
          Chat
          {unreadChat && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D001A] flex-shrink-0" />
          )}
        </button>

        <button
          onClick={() => setDesktopTab('received')}
          data-testid="tab-received"
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            desktopTab === 'received'
              ? 'bg-[#083B3A] text-white shadow-sm'
              : 'text-[#8A4E2A] hover:text-[#111111] hover:bg-white/40'
          }`}
        >
          {`Received${completedCount > 0 ? ` (${completedCount})` : ''}`}
        </button>
      </div>

      {/* Mobile: show section title */}
      <div className="md:hidden">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#8A4E2A]">
          {activeTab === 'send' ? 'Send Files' : activeTab === 'chat' ? 'Chat' : `Received${completedCount > 0 ? ` (${completedCount})` : ''}`}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'send' && (
          <motion.div key="send" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex-1 overflow-y-auto flex flex-col gap-4">
            <SendPanel />
          </motion.div>
        )}
        {activeTab === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex-1 overflow-hidden flex flex-col">
            <ChatPanel />
          </motion.div>
        )}
        {activeTab === 'received' && (
          <motion.div key="received" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1 overflow-y-auto">
            <ReceivedPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chat Panel ───────────────────────────────────────────────
function ChatPanel() {
  const { state, sendChatMessage } = useApp();
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const connectedPeers = [...state.peers.entries()]
    .filter(([, p]) => p.status === 'connected')
    .map(([u]) => u);

  // Auto-select first connected peer
  useEffect(() => {
    if (!activePeer && connectedPeers.length > 0) {
      setActivePeer(connectedPeers[0]);
    }
    if (activePeer && !connectedPeers.includes(activePeer)) {
      setActivePeer(connectedPeers[0] ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedPeers.join(',')]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages.length]);

  const currentUser = state.user?.username ?? '';
  const peerMessages = activePeer
    ? state.chatMessages.filter(
        (m) => m.fromUsername === activePeer || m.fromUsername === currentUser
      )
    : [];

  async function handleSend() {
    if (!input.trim() || !activePeer || sending) return;
    setSending(true);
    await sendChatMessage(activePeer, input.trim());
    setInput('');
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (connectedPeers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-16 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#083B3A]/8 flex items-center justify-center">
          <MessageCircle size={22} className="text-[#083B3A]/50" />
        </div>
        <p className="font-display text-sm font-semibold text-[#111111]">No connected peers</p>
        <p className="font-mono text-xs text-[#8A4E2A] text-center max-w-52">
          Connect with someone first to start an encrypted chat
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-3 overflow-hidden h-full min-h-0">
      {/* Peer list (only if multiple peers) */}
      {connectedPeers.length > 1 && (
        <div className="w-28 md:w-36 flex-shrink-0 flex flex-col gap-1.5 overflow-y-auto">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#8A4E2A] px-1 mb-1">Peers</span>
          {connectedPeers.map((u) => (
            <button
              key={u}
              onClick={() => setActivePeer(u)}
              className={`flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-all ${
                activePeer === u
                  ? 'bg-[#083B3A] text-white'
                  : 'glass text-[#111111] hover:bg-white/50'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                activePeer === u ? 'bg-white/20 text-white' : 'bg-[#CDB49E] text-[#111111]'
              }`}>
                {u.slice(0, 2).toUpperCase()}
              </div>
              <span className="font-mono text-xs truncate">{u}</span>
            </button>
          ))}
        </div>
      )}

      {/* Chat window */}
      <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden min-h-0">
        {/* Chat header */}
        <div className="px-3 py-2 border-b border-[#CDB49E]/20 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Avatar username={activePeer ?? ''} size="sm" teal />
            <div>
              <p className="font-mono text-xs font-bold text-[#111111]">{activePeer}</p>
              <p className="font-mono text-[9px] text-[#083B3A]">E2E encrypted · memory only</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Lock size={9} className="text-[#083B3A]" />
            <span className="font-mono text-[9px] text-[#083B3A]">AES-256-GCM</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
          {peerMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
              <Lock size={16} className="text-[#CDB49E]" />
              <p className="font-mono text-xs text-[#8A4E2A] text-center">
                Say hi! Messages are encrypted.<br />
                <span className="text-[10px] text-[#CDB49E]">Cleared when you close the tab.</span>
              </p>
            </div>
          ) : (
            peerMessages.map((msg) => {
              const isMe = msg.fromUsername === currentUser;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-[#083B3A] text-white rounded-br-sm'
                      : 'bg-white/70 text-[#111111] rounded-bl-sm border border-[#CDB49E]/30'
                  }`}>
                    <p className="break-words">{msg.text}</p>
                    <p className={`font-mono text-[9px] mt-1 ${isMe ? 'text-white/50' : 'text-[#CDB49E]'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-2.5 border-t border-[#CDB49E]/20 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            maxLength={2000}
            className="flex-1 px-3 py-2 rounded-xl text-sm bg-white/60 border border-[#CDB49E]/50
              focus:border-[#083B3A] focus:ring-1 focus:ring-[#083B3A]/15 outline-none transition-all font-mono"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl bg-[#083B3A] text-white flex items-center justify-center hover:bg-[#0a4a49] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Send Panel ───────────────────────────────────────────────
function SendPanel() {
  const { state, sendFiles } = useApp();
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasConnected = [...state.peers.values()].some((p) => p.status === 'connected');

  function handleFiles(files: FileList | null) {
    if (!files || !hasConnected) return;
    sendFiles(Array.from(files));
  }

  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => hasConnected && fileInputRef.current?.click()}
        data-testid="dropzone"
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200
          ${hasConnected ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
          ${dragging
            ? 'border-[#083B3A] bg-[#083B3A]/8 scale-[1.01]'
            : hasConnected
              ? 'border-[#CDB49E]/60 hover:border-[#083B3A]/50 hover:bg-white/25 dropzone-pulse'
              : 'border-[#CDB49E]/40'
          }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all
            ${dragging ? 'bg-[#083B3A] text-white' : 'bg-[#083B3A]/10 text-[#083B3A]'}`}>
            <Upload size={22} />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-[#111111]">
              {dragging ? 'Release to send' : hasConnected ? 'Drop files here' : 'No recipients connected yet'}
            </p>
            <p className="font-mono text-xs text-[#8A4E2A] mt-1">
              {hasConnected
                ? 'Files go directly device-to-device — zero server copies'
                : 'Add recipients and wait for them to accept your request'}
            </p>
          </div>
          {hasConnected && !dragging && (
            <p className="font-mono text-[10px] text-[#CDB49E]">or tap to browse files</p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          data-testid="input-file"
        />
      </div>

      {state.outgoingTransfers.length > 0 && (
        <div className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#8A4E2A]">Outgoing</span>
          <AnimatePresence initial={false}>
            {state.outgoingTransfers.map((t) => (
              <OutgoingRow key={t.transferId} transfer={t} progress={state.transferProgress[t.transferId] ?? 0} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

// ── Speed tracking hook ──────────────────────────────────────
function useTransferSpeed(bytes: number, total: number) {
  const history = useRef<{ time: number; bytes: number }[]>([]);

  useEffect(() => {
    const now = Date.now();
    history.current.push({ time: now, bytes });
    const cutoff = now - 3000;
    history.current = history.current.filter((h) => h.time >= cutoff);
  }, [bytes]);

  const pts = history.current;
  if (pts.length < 2) return { speed: 0, eta: null };
  const oldest = pts[0], latest = pts[pts.length - 1];
  const elapsed = (latest.time - oldest.time) / 1000;
  if (elapsed < 0.15) return { speed: 0, eta: null };
  const speed = Math.max(0, (latest.bytes - oldest.bytes) / elapsed);
  const remaining = total - bytes;
  const eta = speed > 0 && remaining > 0 ? remaining / speed : null;
  return { speed, eta };
}

function OutgoingRow({ transfer, progress }: { transfer: OutgoingTransfer; progress: number }) {
  const pct = transfer.size > 0 ? Math.min(100, (progress / transfer.size) * 100) : 0;
  const { speed, eta } = useTransferSpeed(progress, transfer.size);
  const speedLabel = !transfer.done && speed > 0 ? fmtSpeed(speed) : '';
  const etaLabel   = !transfer.done && eta != null ? fmtEta(eta) : '';

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass rounded-xl p-3 flex items-center gap-3"
    >
      <div className="w-9 h-9 rounded-lg bg-[#083B3A]/10 flex items-center justify-center flex-shrink-0">
        <Send size={14} className="text-[#083B3A]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-[#111111] truncate">{transfer.name || 'File'}</p>
          {transfer.done && <CheckCircle size={12} className="text-[#083B3A] flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 bg-[#E7E3DD] rounded-full overflow-hidden">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-mono text-[10px] text-[#8A4E2A] flex-shrink-0 tabular-nums">
            {fmtBytes(progress)}/{fmtBytes(transfer.size)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {transfer.peerUsername && (
            <span className="font-mono text-[10px] text-[#CDB49E]">→ {transfer.peerUsername}</span>
          )}
          {speedLabel && (
            <span className="font-mono text-[10px] text-[#083B3A] tabular-nums">{speedLabel}</span>
          )}
          {etaLabel && (
            <span className="font-mono text-[10px] text-[#8A4E2A] tabular-nums">{etaLabel}</span>
          )}
          {transfer.done && (
            <span className="font-mono text-[10px] text-[#083B3A]">Complete ✓</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Received Panel ───────────────────────────────────────────
function ReceivedPanel() {
  const { state } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const completed = state.incomingTransfers.filter((t) => !!t.url);
  const allSelected = selected.size === completed.length && completed.length > 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(completed.map((t) => t.transferId)));
  }

  function downloadFile(t: IncomingTransfer) {
    if (!t.url) return;
    const a = document.createElement('a');
    a.href = t.url; a.download = t.name; a.click();
  }

  function downloadSelected() {
    completed.filter((t) => selected.has(t.transferId)).forEach(downloadFile);
  }

  function downloadAll() {
    completed.forEach(downloadFile);
  }

  if (state.incomingTransfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#083B3A]/8 flex items-center justify-center">
          <Download size={22} className="text-[#083B3A]/50" />
        </div>
        <p className="font-display text-sm font-semibold text-[#111111]">Nothing yet</p>
        <p className="font-mono text-xs text-[#8A4E2A]">Files received this session appear here</p>
        <p className="font-mono text-[10px] text-[#CDB49E]">Cleared when you close the tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {completed.length > 0 && (
          <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-[#8A4E2A] hover:text-[#111111] transition-colors" data-testid="button-select-all">
            {allSelected ? <CheckSquare size={14} className="text-[#083B3A]" /> : <Square size={14} />}
            <span className="font-mono">{allSelected ? 'Deselect all' : 'Select all'}</span>
          </button>
        )}
        {selected.size > 0 && (
          <button onClick={downloadSelected} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#083B3A] text-white text-xs rounded-lg font-semibold hover:bg-[#0a4a49] transition-all" data-testid="button-download-selected">
            <Download size={12} /> Download selected ({selected.size})
          </button>
        )}
        {completed.length > 1 && selected.size === 0 && (
          <button onClick={downloadAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#083B3A]/10 text-[#083B3A] text-xs rounded-lg font-semibold border border-[#083B3A]/20 hover:bg-[#083B3A]/15 transition-all" data-testid="button-download-all">
            <Download size={12} /> Download all
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {state.incomingTransfers.map((t, i) => (
          <IncomingFileRow
            key={t.transferId}
            transfer={t}
            bytesReceived={state.transferProgress[t.transferId] ?? t.received}
            index={i}
            isSelected={selected.has(t.transferId)}
            onToggleSelect={toggleSelect}
            onDownload={downloadFile}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function IncomingFileRow({
  transfer: t,
  bytesReceived,
  index,
  isSelected,
  onToggleSelect,
  onDownload,
}: {
  transfer: IncomingTransfer;
  bytesReceived: number;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDownload: (t: IncomingTransfer) => void;
}) {
  const { speed, eta } = useTransferSpeed(bytesReceived, t.size);
  const pct = t.size > 0 ? Math.min(100, (bytesReceived / t.size) * 100) : 0;
  const speedLabel = !t.url && speed > 0 ? fmtSpeed(speed) : '';
  const etaLabel   = !t.url && eta != null ? fmtEta(eta) : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`glass rounded-xl p-3 flex items-center gap-3 transition-all ${
        isSelected ? 'ring-1 ring-[#083B3A]/40' : ''
      }`}
      data-testid={`received-file-${index}`}
    >
      {t.url && (
        <button
          onClick={() => onToggleSelect(t.transferId)}
          className="flex-shrink-0 text-[#CDB49E] hover:text-[#083B3A] transition-colors"
        >
          {isSelected
            ? <CheckSquare size={16} className="text-[#083B3A]" />
            : <Square size={16} />}
        </button>
      )}

      <div className="w-11 h-11 rounded-xl bg-[#E7E3DD] overflow-hidden flex items-center justify-center flex-shrink-0">
        {isImage(t.mime) && t.url
          ? <img src={t.url} alt={t.name} className="w-full h-full object-cover" />
          : <FileTypeIcon mime={t.mime} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#111111] truncate" title={t.name}>{t.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-[10px] text-[#8A4E2A]">{fmtBytes(t.size)}</span>
          <span className="font-mono text-[10px] text-[#CDB49E]">from {t.peerUsername}</span>
        </div>
        {!t.url && (
          <>
            <div className="mt-1.5 h-1 bg-[#E7E3DD] rounded-full overflow-hidden">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-mono text-[10px] text-[#8A4E2A] tabular-nums">
                {fmtBytes(bytesReceived)}/{fmtBytes(t.size)}
              </span>
              {speedLabel && (
                <span className="font-mono text-[10px] text-[#083B3A] tabular-nums">{speedLabel}</span>
              )}
              {etaLabel && (
                <span className="font-mono text-[10px] text-[#8A4E2A] tabular-nums">{etaLabel}</span>
              )}
            </div>
          </>
        )}
      </div>

      {t.url ? (
        <button
          onClick={() => onDownload(t)}
          data-testid={`button-download-${index}`}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-[#083B3A] text-white text-xs rounded-lg font-semibold hover:bg-[#0a4a49] transition-all"
        >
          <Download size={11} /> Save
        </button>
      ) : (
        <Clock size={12} className="text-[#CDB49E] flex-shrink-0 status-connecting" />
      )}
    </motion.div>
  );
}

// ── Login Info Modal ─────────────────────────────────────────
function LoginInfoModal({ user, onClose }: { user: { id: string; username: string; email: string }; onClose: () => void }) {
  const [tab, setTab] = useState<'sessions' | 'password'>('sessions');
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  // Password change state
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const currentToken = getOrCreateSessionToken();

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const data = await getDeviceSessions(user.id, currentToken);
    setSessions(data);
    setLoading(false);
  }, [user.id, currentToken]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  async function handleRemove(sessionId: string) {
    setRemoving(sessionId);
    try {
      await removeDeviceSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Device removed successfully');
    } catch (err: unknown) {
      toast.error('Failed to remove device', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setRemoving(null);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (newPass !== confirmPass) { setPwError('New passwords do not match'); return; }
    if (newPass.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    setPwLoading(true);
    try {
      await updatePassword(user.username, oldPass, newPass);
      setPwSuccess(true);
      setOldPass(''); setNewPass(''); setConfirmPass('');
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-sm glass rounded-2xl border border-[#CDB49E]/40 shadow-2xl overflow-hidden"
      >
        {/* Modal header */}
        <div className="px-4 py-3 border-b border-[#CDB49E]/20 flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold text-[#111111]">Login Info</h2>
            <p className="font-mono text-[10px] text-[#8A4E2A]">{user.username} · {user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#6D001A]/10 transition-all flex items-center justify-center text-[#CDB49E] hover:text-[#6D001A]"
          >
            <X size={13} />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 p-2 border-b border-[#CDB49E]/20">
          <button
            onClick={() => setTab('sessions')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === 'sessions' ? 'bg-[#083B3A] text-white' : 'text-[#8A4E2A] hover:bg-white/40'
            }`}
          >
            <Monitor size={12} />
            Active Sessions
          </button>
          <button
            onClick={() => setTab('password')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === 'password' ? 'bg-[#083B3A] text-white' : 'text-[#8A4E2A] hover:bg-white/40'
            }`}
          >
            <KeyRound size={12} />
            Change Password
          </button>
        </div>

        {/* Content */}
        <div className="p-3 max-h-[60vh] overflow-y-auto">
          {tab === 'sessions' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#8A4E2A]">
                  {sessions.length} device{sessions.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={loadSessions}
                  disabled={loading}
                  className="flex items-center gap-1 text-[10px] font-mono text-[#083B3A] hover:opacity-70 transition-opacity"
                >
                  <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="py-6 text-center font-mono text-xs text-[#CDB49E]">Loading sessions…</div>
              ) : sessions.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="font-mono text-xs text-[#8A4E2A]">No sessions found</p>
                  <p className="font-mono text-[10px] text-[#CDB49E] mt-1">
                    Run the SQL migration to enable session tracking
                  </p>
                </div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                      s.isCurrent
                        ? 'bg-[#083B3A]/6 border-[#083B3A]/20'
                        : 'bg-white/30 border-[#CDB49E]/20'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#CDB49E]/20 flex items-center justify-center flex-shrink-0">
                      {s.device_info?.os === 'Android' || s.device_info?.os === 'iOS'
                        ? <Smartphone size={13} className="text-[#8A4E2A]" />
                        : <Monitor size={13} className="text-[#8A4E2A]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-mono text-xs font-medium text-[#111111] truncate">
                          {s.device_info?.label || 'Unknown device'}
                        </p>
                        {s.isCurrent && (
                          <span className="px-1.5 py-0.5 bg-[#083B3A] text-white text-[9px] font-mono rounded-md flex-shrink-0">
                            This device
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-[#CDB49E]">
                        {new Date(s.last_active).toLocaleString()}
                      </p>
                    </div>
                    {!s.isCurrent && (
                      <button
                        onClick={() => handleRemove(s.id)}
                        disabled={removing === s.id}
                        className="w-7 h-7 rounded-lg hover:bg-[#6D001A]/10 transition-all flex items-center justify-center text-[#CDB49E] hover:text-[#6D001A] flex-shrink-0 disabled:opacity-40"
                        title="Remove this session"
                      >
                        {removing === s.id
                          ? <RefreshCw size={12} className="animate-spin" />
                          : <Trash2 size={12} />}
                      </button>
                    )}
                  </div>
                ))
              )}

              <div className="flex items-start gap-2 mt-2 px-2.5 py-2 bg-[#083B3A]/6 border border-[#083B3A]/15 rounded-xl">
                <Shield size={10} className="text-[#083B3A] flex-shrink-0 mt-0.5" />
                <p className="font-mono text-[9px] text-[#083B3A] leading-relaxed">
                  Removing a session signs that device out immediately.
                  If you don't recognise a device, remove it and change your password.
                </p>
              </div>
            </div>
          )}

          {tab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-[#8A4E2A] mb-1.5 block">
                  Current Password
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CDB49E]" />
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full pl-8 pr-9 py-2.5 rounded-xl text-sm bg-white/60 border border-[#CDB49E]/50 focus:border-[#083B3A] focus:ring-1 focus:ring-[#083B3A]/15 outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CDB49E] hover:text-[#8A4E2A]"
                  >
                    {showOld ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-[#8A4E2A] mb-1.5 block">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CDB49E]" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Min. 6 characters"
                    className="w-full pl-8 pr-9 py-2.5 rounded-xl text-sm bg-white/60 border border-[#CDB49E]/50 focus:border-[#083B3A] focus:ring-1 focus:ring-[#083B3A]/15 outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CDB49E] hover:text-[#8A4E2A]"
                  >
                    {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-[#8A4E2A] mb-1.5 block">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CDB49E]" />
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    required
                    placeholder="Repeat new password"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm bg-white/60 border border-[#CDB49E]/50 focus:border-[#083B3A] focus:ring-1 focus:ring-[#083B3A]/15 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <AnimatePresence>
                {pwError && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="font-mono text-xs text-[#6D001A] flex items-center gap-1.5">
                    <AlertTriangle size={11} /> {pwError}
                  </motion.p>
                )}
                {pwSuccess && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="font-mono text-xs text-[#083B3A] flex items-center gap-1.5">
                    <CheckCircle size={11} /> Password updated successfully
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full py-2.5 rounded-xl bg-[#083B3A] text-white text-sm font-semibold hover:bg-[#0a4a49] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pwLoading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Shared mini-components ───────────────────────────────────
function Avatar({ username, size = 'md', teal = false }: { username: string; size?: 'sm' | 'md'; teal?: boolean }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <div className={`${sz} rounded-lg flex items-center justify-center font-display font-bold flex-shrink-0
      ${teal ? 'bg-[#083B3A] text-white' : 'bg-[#CDB49E] text-[#111111]'}`}>
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'connected' ? 'bg-[#083B3A]' :
    status === 'failed' ? 'bg-[#6D001A]' :
    'bg-[#CDB49E]';
  return (
    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${color}
      ${status === 'connecting' ? 'status-connecting' : ''}`} />
  );
}

function FileTypeIcon({ mime }: { mime: string }) {
  const kind = fileIconKind(mime);
  const iconProps = { size: 18, className: 'text-[#8A4E2A]' };
  const icons: Record<string, React.ReactNode> = {
    image: <Image {...iconProps} />,
    video: <Video {...iconProps} />,
    audio: <Music {...iconProps} />,
    pdf: <FileText {...iconProps} />,
    archive: <Archive {...iconProps} />,
    code: <Code {...iconProps} />,
    text: <FileText {...iconProps} />,
    file: <File {...iconProps} />,
  };
  return <>{icons[kind] ?? icons.file}</>;
}
