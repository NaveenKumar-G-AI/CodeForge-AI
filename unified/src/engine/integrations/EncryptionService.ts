/**
 * Encryption Service - Handles encryption/decryption of credentials at rest
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export interface EncryptionConfig {
  masterKey: string; // Should come from environment variable
  algorithm: 'aes-256-gcm';
  keyLength: 32;
  ivLength: 16;
  saltLength: 16;
  tagLength: 16;
}

export class EncryptionService {
  private readonly config: EncryptionConfig;
  private readonly derivedKey: Buffer | null = null;

  constructor(config: EncryptionConfig) {
    this.config = config;
  }

  private async getKey(): Promise<Buffer> {
    if (this.derivedKey) {
      return this.derivedKey;
    }

    const salt = Buffer.from(this.config.masterKey.slice(0, this.config.saltLength));
    const key = await scryptAsync(this.config.masterKey, salt, this.config.keyLength);
    return key as Buffer;
  }

  async encrypt(plaintext: string): Promise<string> {
    const key = await this.getKey();
    const iv = randomBytes(this.config.ivLength);
    const cipher = createCipheriv(this.config.algorithm, key, iv);

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // Combine: salt + iv + tag + ciphertext
    const combined = Buffer.concat([
      Buffer.from(this.config.masterKey.slice(0, this.config.saltLength)), // salt
      iv,
      tag,
      ciphertext,
    ]);

    return combined.toString('base64');
  }

  async decrypt(ciphertext: string): Promise<string> {
    const key = await this.getKey();
    const combined = Buffer.from(ciphertext, 'base64');

    // Extract components
    const salt = combined.slice(0, this.config.saltLength);
    const iv = combined.slice(this.config.saltLength, this.config.saltLength + this.config.ivLength);
    const tag = combined.slice(
      this.config.saltLength + this.config.ivLength,
      this.config.saltLength + this.config.ivLength + this.config.tagLength
    );
    const encrypted = combined.slice(this.config.saltLength + this.config.ivLength + this.config.tagLength);

    // Verify salt matches
    if (!salt.equals(Buffer.from(this.config.masterKey.slice(0, this.config.saltLength)))) {
      throw new Error('Invalid encryption salt');
    }

    const decipher = createDecipheriv(this.config.algorithm, key, iv);
    decipher.setAuthTag(tag);

    const plaintext = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  }
}

// Factory function to create encryption service from env
export function createEncryptionService(): EncryptionService {
  const masterKey = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!masterKey || masterKey.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }

  return new EncryptionService({
    masterKey,
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 16,
    tagLength: 16,
  });
}
