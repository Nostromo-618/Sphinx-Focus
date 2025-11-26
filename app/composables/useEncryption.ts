/**
 * Encryption composable using Web Crypto API
 * Provides AES-GCM 256-bit encryption with PBKDF2 key derivation
 */

const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH = 256
const SALT_LENGTH = 16
const IV_LENGTH = 12

export function useEncryption() {
  /**
   * Generate a random salt for PBKDF2
   */
  function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  }

  /**
   * Generate a random initialization vector for AES-GCM
   */
  function generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  }

  /**
   * Generate a random AES-GCM key (for auto-key mode)
   */
  async function generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: KEY_LENGTH },
      true, // extractable - needed for export/storage
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Derive an AES-GCM key from a PIN using PBKDF2
   */
  async function deriveKeyFromPIN(pin: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const pinBuffer = encoder.encode(pin)

    // Import PIN as raw key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      pinBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    )

    // Derive AES-GCM key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: KEY_LENGTH },
      false, // not extractable - stays in memory
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Export a CryptoKey to base64 string (for auto-key storage)
   */
  async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key)
    return arrayBufferToBase64(exported)
  }

  /**
   * Import a base64 string back to CryptoKey
   */
  async function importKey(keyString: string): Promise<CryptoKey> {
    const keyBuffer = base64ToArrayBuffer(keyString)
    return crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM', length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt data using AES-GCM
   * Returns base64 string containing: IV (12 bytes) + ciphertext
   */
  async function encrypt(data: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const iv = generateIV()

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      dataBuffer
    )

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(ciphertext), iv.length)

    return arrayBufferToBase64(combined.buffer)
  }

  /**
   * Decrypt data using AES-GCM
   * Expects base64 string containing: IV (12 bytes) + ciphertext
   */
  async function decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedData))

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH)
    const ciphertext = combined.slice(IV_LENGTH)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
    const bytes = new Uint8Array(buffer as ArrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!)
    }
    return btoa(binary)
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Convert Uint8Array to base64 string
   */
  function uint8ArrayToBase64(array: Uint8Array): string {
    return arrayBufferToBase64(array.buffer as ArrayBuffer)
  }

  /**
   * Convert base64 string to Uint8Array
   */
  function base64ToUint8Array(base64: string): Uint8Array {
    return new Uint8Array(base64ToArrayBuffer(base64))
  }

  return {
    generateSalt,
    generateKey,
    deriveKeyFromPIN,
    exportKey,
    importKey,
    encrypt,
    decrypt,
    uint8ArrayToBase64,
    base64ToUint8Array
  }
}
