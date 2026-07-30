import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Upload, Download, CheckSquare, Square, Shield,
  Wifi, WifiOff, LogOut, FileText, Image, Video, Music, Archive,
  Code, File, CheckCircle, Clock, AlertCircle, Send
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { searchUsers } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { fmtBytes, fmtSpeed, fmtEta, fileIconKind, isImage } from '@/lib/fileUtils';
import type { IncomingTransfer, OutgoingTransfer } from '@/lib/p2p';

// ── Top-level guard ──────────────────────────────────────────
export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { state, logout } = useApp();

  useEffect(() => {
    if (!getSession()) setLocation('/');
  }, [setLocation]);

  function handleLogout() {
    logout();
    setLocation('/');
  }

  if (!state.user) return null;

  return (
    <div className="oreopie-bg min-h-screen flex flex-col">
      {/* Background blobs */}
      <div className="blob w-[600px] h-[600px] top-[-150px] right-[-150px]"
        style={{ background: 'rgba(8,59,58,0.08)' }} />
      <div className="blob w-[400px] h-[400px] bottom-[-100px] left-[-100px]"
        style={{ background: 'rgba(109,0,26,0.07)' }} />
      <div className="blob w-[350px] h-[350px] top-[35%] left-[40%]"
        style={{ background: 'rgba(138,78,42,0.06)' }} />

      {/* Header */}
      <header className="relative z-10 glass-subtle border-b border-[#CDB49E]/30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-xl font-bold text-[#111111] tracking-wide">OreoPie</h1>
        </div>
        <div className="flex items-center gap-3">
          <Shield size={14} className="text-[#083B3A]" />
          <span className="font-mono text-xs text-[#8A4E2A]">
            <span className="text-[#111111] font-bold">{state.user.username}</span>
          </span>
          <button
            onClick={handleLogout}
            data-testid="button-logout"
            className="flex items-center gap-1.5 text-xs text-[#8A4E2A] hover:text-[#6D001A] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#6D001A]/8 border border-transparent hover:border-[#6D001A]/20"
          >
            <LogOut size={13} />
            <span className="font-mono">Sign out</span>
          </button>
        </div>
      </header>

      {/* Connection Requests */}
      <AnimatePresence>
        {state.pendingRequests.map((req) => (
          <RequestBanner key={req.fromUsername} req={req} />
        ))}
      </AnimatePresence>

      {/* Main layout */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Left panel — Recipients */}
        <aside className="w-80 border-r border-[#CDB49E]/25 flex flex-col bg-white/20 backdrop-blur-sm">
          <RecipientsPanel />
        </aside>

        {/* Right panel — Transfer */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <TransferPanel />
        </main>
      </div>
    </div>
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
      className="relative z-20 mx-4 mt-3 glass rounded-xl px-4 py-3 flex items-center justify-between gap-4 border border-[#083B3A]/20"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#083B3A] flex items-center justify-center">
          <span className="font-display text-xs font-bold text-white">
            {req.fromUsername.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-[#111111]">
            <span className="font-bold">{req.fromUsername}</span> wants to connect
          </p>
          <p className="font-mono text-[10px] text-[#8A4E2A]">Peer-to-peer encrypted session</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => acceptRequest(req.fromUsername, req.sessionId)}
          data-testid={`button-accept-${req.fromUsername}`}
          className="px-3 py-1.5 rounded-lg bg-[#083B3A] text-white text-xs font-semibold hover:bg-[#0a4a49] transition-all"
        >
          Accept
        </button>
        <button
          onClick={() => rejectRequest(req.fromUsername, req.sessionId)}
          data-testid={`button-reject-${req.fromUsername}`}
          className="px-3 py-1.5 rounded-lg bg-[#6D001A]/10 text-[#6D001A] text-xs font-semibold border border-[#6D001A]/20 hover:bg-[#6D001A]/15 transition-all"
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
      <div className="p-4 border-b border-[#CDB49E]/20">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#8A4E2A]">
            Send To
          </span>
          <span className="font-mono text-[10px] text-[#083B3A]">
            {connectedCount} connected
          </span>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CDB49E]" />
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

        {/* Search results dropdown */}
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

      {/* Recipient list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
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

      {/* Security note */}
      <div className="p-4 border-t border-[#CDB49E]/20">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#083B3A]/6 border border-[#083B3A]/15 rounded-xl">
          <Shield size={12} className="text-[#083B3A] flex-shrink-0" />
          <p className="font-mono text-[10px] text-[#083B3A] leading-relaxed">
            DTLS encrypted · files never touch any server · session ends with tab
          </p>
        </div>
      </div>
    </>
  );
}

// ── Transfer Panel ───────────────────────────────────────────
function TransferPanel() {
  const [tab, setTab] = useState<'send' | 'received'>('send');
  const { state } = useApp();

  // Auto-switch to received tab on new incoming
  const prevIncoming = useRef(state.incomingTransfers.length);
  useEffect(() => {
    if (state.incomingTransfers.length > prevIncoming.current) {
      setTab('received');
    }
    prevIncoming.current = state.incomingTransfers.length;
  }, [state.incomingTransfers.length]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden p-5 gap-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl w-fit">
        {(['send', 'received'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            data-testid={`tab-${t}`}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t
                ? 'bg-[#083B3A] text-white shadow-sm'
                : 'text-[#8A4E2A] hover:text-[#111111] hover:bg-white/40'
            }`}
          >
            {t === 'send' ? 'Send Files' : `Received ${state.incomingTransfers.length > 0 ? `(${state.incomingTransfers.filter(t => t.url).length})` : ''}`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'send' ? (
          <motion.div key="send" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex-1 overflow-y-auto flex flex-col gap-4">
            <SendPanel />
          </motion.div>
        ) : (
          <motion.div key="received" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1 overflow-y-auto">
            <ReceivedPanel />
          </motion.div>
        )}
      </AnimatePresence>
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
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => hasConnected && fileInputRef.current?.click()}
        data-testid="dropzone"
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200
          ${hasConnected ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
          ${dragging
            ? 'border-[#083B3A] bg-[#083B3A]/8 scale-[1.01]'
            : hasConnected
              ? 'border-[#CDB49E]/60 hover:border-[#083B3A]/50 hover:bg-white/25 dropzone-pulse'
              : 'border-[#CDB49E]/40'
          }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all
            ${dragging ? 'bg-[#083B3A] text-white' : 'bg-[#083B3A]/10 text-[#083B3A]'}`}>
            <Upload size={24} />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-[#111111]">
              {dragging ? 'Release to send' : hasConnected ? 'Drop files here' : 'No recipients connected yet'}
            </p>
            <p className="font-mono text-xs text-[#8A4E2A] mt-1">
              {hasConnected
                ? 'Files go directly device-to-device — zero server copies'
                : 'Add recipients and wait for them to accept your request'}
            </p>
          </div>
          {hasConnected && !dragging && (
            <p className="font-mono text-[10px] text-[#CDB49E]">or click to browse files</p>
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

      {/* Outgoing transfers */}
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
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-16 h-16 rounded-2xl bg-[#083B3A]/8 flex items-center justify-center">
          <Download size={24} className="text-[#083B3A]/50" />
        </div>
        <p className="font-display text-sm font-semibold text-[#111111]">Nothing yet</p>
        <p className="font-mono text-xs text-[#8A4E2A]">Files received this session appear here</p>
        <p className="font-mono text-[10px] text-[#CDB49E]">Cleared when you close the tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
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

      {/* File list */}
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

// ── Incoming file row (own hook for speed tracking) ──────────
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
      {/* Checkbox */}
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

      {/* Preview / Icon */}
      <div className="w-12 h-12 rounded-xl bg-[#E7E3DD] overflow-hidden flex items-center justify-center flex-shrink-0">
        {isImage(t.mime) && t.url
          ? <img src={t.url} alt={t.name} className="w-full h-full object-cover" />
          : <FileTypeIcon mime={t.mime} />}
      </div>

      {/* Info */}
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

      {/* Download / status */}
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
  const iconProps = { size: 20, className: 'text-[#8A4E2A]' };
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
