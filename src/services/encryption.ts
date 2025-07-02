// Encryption service using Web Crypto API (equivalent to your Python cryptography)
export class EncryptionService {
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  static async encrypt(data: string, password: string): Promise<{ encrypted: string; salt: string; iv: string }> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const key = await this.deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encoder.encode(data)
    );

    return {
      encrypted: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join(''),
      salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
    };
  }

  static async decrypt(encryptedHex: string, saltHex: string, ivHex: string, password: string): Promise<string> {
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encrypted = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const key = await this.deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}

// Credentials storage service (equivalent to your encrypted config files)
export class CredentialsService {
  private static readonly STORAGE_KEY = "ido_encrypted_credentials";

  static async saveCredentials(credentials: any, password: string): Promise<void> {
    try {
      const configString = JSON.stringify(credentials);
      const encrypted = await EncryptionService.encrypt(configString, password);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(encrypted));
    } catch (error) {
      throw new Error(`Failed to save credentials: ${error}`);
    }
  }

  static async loadCredentials(password: string): Promise<any> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        throw new Error("No credentials found");
      }

      const encrypted = JSON.parse(stored);
      const decrypted = await EncryptionService.decrypt(
        encrypted.encrypted,
        encrypted.salt,
        encrypted.iv,
        password
      );
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Failed to load credentials: ${error}`);
    }
  }

  static hasCredentials(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }

  static clearCredentials(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}