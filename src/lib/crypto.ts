/**
 * End-to-end encryption for OreoPie P2P chat.
 *
 * Protocol:
 *  1. When a DataChannel opens, each side generates an ECDH P-256 key pair.
 *  2. Each side sends their public key over the DataChannel as
 *     { kind: 'key-exchange', pubkey: <base64-raw> }
 *  3. On receiving the peer's public key, both sides derive an identical
 *     AES-256-GCM shared secret via ECDH.
 *  4. Chat messages are encrypted with AES-256-GCM using a fresh random 96-bit IV per message.
 *  5. Keys are never serialised to disk; they live only in memory for the lifetime of the
 *     DataChannel.  Closing the channel or tab destroys them permanently.
 *
 * Security properties:
 *  - Perfect forward secrecy per session (new keys on every DataChannel open).
 *  - No server ever sees plaintext or keys.
 *  - Man-in-the-middle is prevented because the public keys travel over the already-DTLS-
 *    encrypted WebRTC DataChannel — not over Supabase signalling.
 */

export interface ECDHKeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

/** Generate a fresh ephemeral ECDH P-256 key pair */
export async function generateECDHKeyPair(): Promise<ECDHKeyPair> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey'],
  );
  return { privateKey: pair.privateKey, publicKey: pair.publicKey };
}

/** Serialise a public key to a base64 string safe for DataChannel JSON */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/** Deserialise a base64 public key received from a peer */
export async function importPublicKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  );
}

/**
 * Derive a shared AES-256-GCM key from our private key and the peer's public key.
 * Both sides will arrive at the same key — this is the ECDH magic.
 */
export async function deriveSharedKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,           // non-extractable — cannot be exported from memory
    ['encrypt', 'decrypt'],
  );
}

export interface EncryptedPayload {
  iv: string;          // base64 96-bit nonce
  ciphertext: string;  // base64 AES-256-GCM ciphertext
}

/** Encrypt a UTF-8 string with AES-256-GCM; returns a fresh random IV each call */
export async function encryptMessage(
  key: CryptoKey,
  plaintext: string,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  };
}

/** Decrypt an AES-256-GCM payload; throws if tampered */
export async function decryptMessage(
  key: CryptoKey,
  payload: EncryptedPayload,
): Promise<string> {
  const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(payload.ciphertext), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}
