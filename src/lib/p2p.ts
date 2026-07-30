import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const CHUNK_SIZE = 64 * 1024; // 64 KB

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export type PeerStatus = 'pending' | 'connecting' | 'connected' | 'failed' | 'disconnected';

export interface Peer {
  username: string;
  status: PeerStatus;
  conn: RTCPeerConnection;
  dc: RTCDataChannel | null;
  sessionId: string;
}

export interface IncomingTransfer {
  transferId: string;
  name: string;
  size: number;
  mime: string;
  received: number;
  chunks: ArrayBuffer[];
  peerUsername: string;
  blob?: Blob;
  url?: string;
}

export interface OutgoingTransfer {
  transferId: string;
  name: string;
  size: number;
  sent: number;
  peerUsername: string;
  done: boolean;
}

type BroadcastMsg =
  | { type: 'request';          from: string; sessionId: string }
  | { type: 'request-accepted'; from: string; sessionId: string }
  | { type: 'request-rejected'; from: string; sessionId: string }
  | { type: 'offer';   from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer';  from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice';     from: string; to: string; candidate: RTCIceCandidateInit };

export class P2PManager {
  readonly username: string;

  private personalChannel: RealtimeChannel | null = null;
  private sessionChannels = new Map<string, RealtimeChannel>();
  private peers = new Map<string, Peer>(); // keyed by username
  private incoming = new Map<string, IncomingTransfer>(); // keyed by transferId

  // ── Callbacks ──────────────────────────────────────────────
  onPeersChanged?:       (peers: Map<string, Peer>) => void;
  onConnectionRequest?:  (fromUsername: string, sessionId: string) => void;
  onRequestAccepted?:    (fromUsername: string) => void;
  onRequestRejected?:    (fromUsername: string) => void;
  onIncomingTransfer?:   (t: IncomingTransfer) => void;
  onTransferProgress?:   (transferId: string, received: number, total: number) => void;
  onTransferComplete?:   (t: IncomingTransfer) => void;
  onOutgoingStart?:      (transferId: string, name: string, size: number, peerUsername: string) => void;
  onOutgoingProgress?:   (transferId: string, sent: number, total: number) => void;
  onOutgoingComplete?:   (transferId: string) => void;
  onError?:              (msg: string) => void;

  constructor(username: string) {
    this.username = username;
  }

  /** Subscribe to personal inbox channel — call once on login */
  connect(): void {
    const ch = supabase.channel(`oreopie:inbox:${this.username}`, {
      config: { broadcast: { self: false } },
    });
    ch.on('broadcast', { event: 'msg' }, (payload: { payload: BroadcastMsg }) => {
      this.handlePersonalMsg(payload.payload);
    });
    ch.subscribe();
    this.personalChannel = ch;
  }

  /** Send a connection request to another user */
  sendRequest(toUsername: string): string {
    const sessionId = crypto.randomUUID();
    this.signalTo(toUsername, { type: 'request', from: this.username, sessionId });
    // Add peer in 'pending' state
    const conn = this.buildConn(toUsername, sessionId, true /* initiator */);
    const peer: Peer = { username: toUsername, status: 'pending', conn, dc: null, sessionId };
    this.peers.set(toUsername, peer);
    this.onPeersChanged?.(new Map(this.peers));
    return sessionId;
  }

  acceptRequest(fromUsername: string, sessionId: string): void {
    this.signalTo(fromUsername, { type: 'request-accepted', from: this.username, sessionId });
    // Join session channel as answerer
    this.joinSession(sessionId, fromUsername, false);
  }

  rejectRequest(fromUsername: string, sessionId: string): void {
    this.signalTo(fromUsername, { type: 'request-rejected', from: this.username, sessionId });
  }

  removePeer(username: string): void {
    const peer = this.peers.get(username);
    if (peer) {
      peer.dc?.close();
      peer.conn.close();
      const ch = this.sessionChannels.get(peer.sessionId);
      if (ch) {
        supabase.removeChannel(ch);
        this.sessionChannels.delete(peer.sessionId);
      }
      this.peers.delete(username);
    }
    this.onPeersChanged?.(new Map(this.peers));
  }

  getPeers(): Map<string, Peer> {
    return new Map(this.peers);
  }

  /** Send one or more files to a set of connected peers */
  async sendFiles(toUsernames: string[], files: File[]): Promise<void> {
    for (const file of files) {
      for (const username of toUsernames) {
        const peer = this.peers.get(username);
        if (!peer?.dc || peer.dc.readyState !== 'open') {
          this.onError?.(`${username} is not connected yet`);
          continue;
        }
        const transferId = crypto.randomUUID();
        this.onOutgoingStart?.(transferId, file.name, file.size, username);
        peer.dc.send(
          JSON.stringify({
            kind: 'file-start',
            transferId,
            name: file.name,
            size: file.size,
            mime: file.type || 'application/octet-stream',
          })
        );
        const reader = file.stream().getReader();
        let sent = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (let i = 0; i < value.length; i += CHUNK_SIZE) {
            const chunk = value.slice(i, i + CHUNK_SIZE);
            // Back-pressure: wait if buffer is filling up
            while (peer.dc.bufferedAmount > 8 * 1024 * 1024) {
              await new Promise((r) => setTimeout(r, 40));
            }
            peer.dc.send(chunk);
            sent += chunk.byteLength;
            this.onOutgoingProgress?.(transferId, sent, file.size);
          }
        }
        peer.dc.send(JSON.stringify({ kind: 'file-end', transferId }));
        this.onOutgoingComplete?.(transferId);
      }
    }
  }

  /** Tear everything down (call on logout / beforeunload) */
  disconnect(): void {
    this.peers.forEach((p) => {
      p.dc?.close();
      p.conn.close();
    });
    this.peers.clear();
    this.sessionChannels.forEach((ch) => supabase.removeChannel(ch));
    this.sessionChannels.clear();
    if (this.personalChannel) {
      supabase.removeChannel(this.personalChannel);
      this.personalChannel = null;
    }
    this.incoming.clear();
    this.onPeersChanged?.(new Map());
  }

  // ── Private helpers ─────────────────────────────────────────

  private signalTo(toUsername: string, msg: BroadcastMsg): void {
    supabase.channel(`oreopie:inbox:${toUsername}`).send({
      type: 'broadcast',
      event: 'msg',
      payload: msg,
    });
  }

  private signalOnSession(sessionId: string, msg: BroadcastMsg): void {
    const ch = this.sessionChannels.get(sessionId);
    ch?.send({ type: 'broadcast', event: 'signal', payload: msg });
  }

  private handlePersonalMsg(msg: BroadcastMsg): void {
    if (msg.type === 'request') {
      this.onConnectionRequest?.(msg.from, msg.sessionId);
    } else if (msg.type === 'request-accepted') {
      // We were the initiator — now join the session channel and start WebRTC
      this.onRequestAccepted?.(msg.from);
      const peer = this.peers.get(msg.from);
      if (peer) {
        peer.status = 'connecting';
        this.onPeersChanged?.(new Map(this.peers));
        this.joinSession(msg.sessionId, msg.from, true);
      }
    } else if (msg.type === 'request-rejected') {
      this.onRequestRejected?.(msg.from);
      this.peers.delete(msg.from);
      this.onPeersChanged?.(new Map(this.peers));
    }
  }

  private joinSession(sessionId: string, peerUsername: string, initiator: boolean): void {
    const ch = supabase.channel(`oreopie:session:${sessionId}`, {
      config: { broadcast: { self: false } },
    });
    ch.on('broadcast', { event: 'signal' }, (payload: { payload: BroadcastMsg }) => {
      this.handleSessionMsg(sessionId, peerUsername, payload.payload);
    });
    ch.subscribe(async () => {
      if (initiator) {
        // Start WebRTC negotiation after channel is subscribed
        await new Promise((r) => setTimeout(r, 300)); // small delay for other side to subscribe
        const peer = this.peers.get(peerUsername);
        if (peer && peer.status !== 'connected') {
          // Trigger offer via onnegotiationneeded
          const dc = peer.conn.createDataChannel('oreopie', { ordered: true });
          this.setupDC(peer, dc);
          const offer = await peer.conn.createOffer();
          await peer.conn.setLocalDescription(offer);
          this.signalOnSession(sessionId, {
            type: 'offer',
            from: this.username,
            to: peerUsername,
            sdp: offer,
          });
        }
      } else {
        // Make sure we have a peer entry for the answerer side
        if (!this.peers.has(peerUsername)) {
          const conn = this.buildConn(peerUsername, sessionId, false);
          const peer: Peer = { username: peerUsername, status: 'connecting', conn, dc: null, sessionId };
          this.peers.set(peerUsername, peer);
          this.onPeersChanged?.(new Map(this.peers));
        }
      }
    });
    this.sessionChannels.set(sessionId, ch);
  }

  private async handleSessionMsg(
    sessionId: string,
    expectedPeer: string,
    msg: BroadcastMsg
  ): Promise<void> {
    if (msg.type !== 'offer' && msg.type !== 'answer' && msg.type !== 'ice') return;
    if (msg.to !== this.username) return;
    const from = msg.from;
    let peer = this.peers.get(from);
    if (!peer) {
      // Answerer side: create peer if not yet
      const conn = this.buildConn(from, sessionId, false);
      peer = { username: from, status: 'connecting', conn, dc: null, sessionId };
      this.peers.set(from, peer);
      this.onPeersChanged?.(new Map(this.peers));
    }

    if (msg.type === 'offer') {
      await peer.conn.setRemoteDescription(msg.sdp);
      const answer = await peer.conn.createAnswer();
      await peer.conn.setLocalDescription(answer);
      this.signalOnSession(sessionId, {
        type: 'answer',
        from: this.username,
        to: from,
        sdp: answer,
      });
    } else if (msg.type === 'answer') {
      await peer.conn.setRemoteDescription(msg.sdp);
    } else if (msg.type === 'ice') {
      try {
        await peer.conn.addIceCandidate(msg.candidate);
      } catch {
        // ignore stale candidates
      }
    }
  }

  private buildConn(peerUsername: string, sessionId: string, initiator: boolean): RTCPeerConnection {
    const conn = new RTCPeerConnection(ICE_SERVERS);

    conn.onicecandidate = (e) => {
      if (e.candidate) {
        this.signalOnSession(sessionId, {
          type: 'ice',
          from: this.username,
          to: peerUsername,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    conn.onconnectionstatechange = () => {
      const peer = this.peers.get(peerUsername);
      if (!peer) return;
      const state = conn.connectionState;
      if (state === 'connected') peer.status = 'connected';
      else if (state === 'failed' || state === 'disconnected') peer.status = 'failed';
      else peer.status = 'connecting';
      this.onPeersChanged?.(new Map(this.peers));
    };

    if (!initiator) {
      conn.ondatachannel = (e) => {
        const peer = this.peers.get(peerUsername);
        if (peer) this.setupDC(peer, e.channel);
      };
    }

    return conn;
  }

  private setupDC(peer: Peer, dc: RTCDataChannel): void {
    dc.binaryType = 'arraybuffer';
    peer.dc = dc;
    dc.onopen = () => {
      peer.status = 'connected';
      this.onPeersChanged?.(new Map(this.peers));
    };
    dc.onclose = () => {
      peer.status = 'disconnected';
      this.onPeersChanged?.(new Map(this.peers));
    };
    dc.onerror = () => {
      peer.status = 'failed';
      this.onPeersChanged?.(new Map(this.peers));
    };
    dc.onmessage = (e) => this.handleData(peer.username, e.data);
  }

  private handleData(fromUsername: string, data: string | ArrayBuffer): void {
    if (typeof data === 'string') {
      const msg = JSON.parse(data);
      if (msg.kind === 'file-start') {
        const t: IncomingTransfer = {
          transferId: msg.transferId,
          name: msg.name,
          size: msg.size,
          mime: msg.mime,
          received: 0,
          chunks: [],
          peerUsername: fromUsername,
        };
        this.incoming.set(msg.transferId, t);
        this.onIncomingTransfer?.(t);
      } else if (msg.kind === 'file-end') {
        const t = this.incoming.get(msg.transferId);
        if (!t) return;
        t.blob = new Blob(t.chunks, { type: t.mime });
        t.url = URL.createObjectURL(t.blob);
        this.onTransferComplete?.({ ...t });
        this.incoming.delete(msg.transferId);
      }
    } else {
      // Binary chunk — find the latest open incoming transfer from this peer
      const active = [...this.incoming.values()]
        .reverse()
        .find((t) => t.peerUsername === fromUsername && t.received < t.size);
      if (!active) return;
      active.chunks.push(data as ArrayBuffer);
      active.received += (data as ArrayBuffer).byteLength;
      this.onTransferProgress?.(active.transferId, active.received, active.size);
    }
  }
}
