import { join, dirname } from "path";
import { env } from "../config/env";
import { EncryptedTokens, TwitterTokens } from "../types";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";

// File path for storing encrypted tokens
const TOKENS_FILE_PATH = join(import.meta.dir, "../../data/tokens.json");
const TOKENS_DIR_PATH = join(import.meta.dir, "../../data");
// Encryption settings
const ALGORITHM = "AES-GCM"; // Using Web Crypto API algorithm name
const KEY_LENGTH = 32; // 256-bit key

// Get salt and ENCRYPTION_IV from environment variables
const SALT = new Uint8Array(Buffer.from(env.ENCRYPTION_SALT, "hex"));
const ENCRYPTION_IV = new Uint8Array(Buffer.from(env.ENCRYPTION_IV, "hex"));

/**
 * Convert a string to a key using PBKDF2
 * @param encryptionKey - The encryption key from environment
 * @returns A Promise containing the derived key
 */
async function deriveKey(encryptionKey: string): Promise<CryptoKey> {
  // Import the encryption key as raw material
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(encryptionKey),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Derive a key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: SALT,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH * 8 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt text data
 * @param text - The text to encrypt
 * @param encryptionKey - The encryption key
 * @returns The encrypted text with authentication tag
 */
export async function encrypt(
  text: string,
  encryptionKey: string
): Promise<string> {
  const key = await deriveKey(encryptionKey);
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // Encrypt the data
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: ENCRYPTION_IV,
    },
    key,
    data
  );

  // Convert the encrypted buffer to base64
  return Buffer.from(encryptedBuffer).toString("base64");
}

/**
 * Decrypt encrypted text
 * @param encryptedText - The encrypted text (base64 encoded)
 * @param encryptionKey - The encryption key
 * @returns The decrypted text
 */
export async function decrypt(
  encryptedText: string,
  encryptionKey: string
): Promise<string> {
  const key = await deriveKey(encryptionKey);
  const encryptedBuffer = Buffer.from(encryptedText, "base64");

  // Decrypt the data
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: ENCRYPTION_IV,
    },
    key,
    encryptedBuffer
  );

  // Convert the decrypted buffer to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Save Twitter tokens to file system in encrypted format
 * @param accessToken - Twitter API access token
 * @param refreshToken - Twitter API refresh token
 * @param encryptionKey - The encryption key
 */
export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  encryptionKey: string
): Promise<void> {
  const encryptedAccessToken = await encrypt(accessToken, encryptionKey);
  const encryptedRefreshToken = await encrypt(refreshToken, encryptionKey);

  const tokens: EncryptedTokens = {
    encryptedAccessToken,
    encryptedRefreshToken,
  };

  // Ensure directory exists
  const dirPath = join(dirname(TOKENS_FILE_PATH));
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }

  writeFileSync(TOKENS_FILE_PATH, JSON.stringify(tokens, null, 2));
}

/**
 * Load Twitter tokens from file system and decrypt them
 * @param encryptionKey - The encryption key
 * @returns The decrypted Twitter tokens
 */
export async function loadTokens(
  encryptionKey: string
): Promise<TwitterTokens> {
  if (!existsSync(TOKENS_FILE_PATH)) {
    throw new Error(
      "Twitter tokens file not found. Please set up tokens first."
    );
  }

  const tokensData = readFileSync(TOKENS_FILE_PATH, "utf8");
  const encryptedTokens: EncryptedTokens = JSON.parse(tokensData);

  const accessToken = await decrypt(
    encryptedTokens.encryptedAccessToken,
    encryptionKey
  );
  const refreshToken = await decrypt(
    encryptedTokens.encryptedRefreshToken,
    encryptionKey
  );

  return { accessToken, refreshToken };
}

export async function tokenAlreadyExists(): Promise<boolean> {
  try {
    // Check if directory exists, if not create it
    if (!existsSync(TOKENS_DIR_PATH)) {
      mkdirSync(TOKENS_DIR_PATH, { recursive: true });
      return false;
    }

    // Check if file exists
    if (!existsSync(TOKENS_FILE_PATH)) {
      return false;
    }

    // Read and check if file has valid tokens
    const tokensData = readFileSync(TOKENS_FILE_PATH, "utf8");
    if (!tokensData) {
      return false;
    }

    const encryptedTokens: EncryptedTokens = JSON.parse(tokensData);
    return encryptedTokens.encryptedAccessToken?.length > 0 && 
           encryptedTokens.encryptedRefreshToken?.length > 0;
  } catch (error) {
    console.error("Error checking tokens:", error);
    return false;
  }
}

