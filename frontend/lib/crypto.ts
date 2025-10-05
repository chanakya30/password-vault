// Temporary fix - create a simple implementation without libsodium for now
// In production, you should install libsodium-wrappers properly

export interface EncryptedData {
  ciphertext: string;
  nonce: string;
}

// Simple XOR encryption for demo purposes (NOT SECURE FOR PRODUCTION)
// Replace with libsodium-wrappers in production
const simpleEncrypt = (text: string, key: string): EncryptedData => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return {
    ciphertext: btoa(result),
    nonce: 'demo-nonce-' + Math.random().toString(36).substring(2)
  };
};

const simpleDecrypt = (encryptedData: EncryptedData, key: string): string => {
  const decoded = atob(encryptedData.ciphertext);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
};

export class CryptoService {
  static async deriveKey(password: string, salt: string): Promise<string> {
    // Simple key derivation for demo
    return btoa(password + salt).substring(0, 32);
  }

  static async encrypt(plaintext: string, key: string): Promise<EncryptedData> {
    return simpleEncrypt(plaintext, key);
  }

  static async decrypt(encryptedData: EncryptedData, key: string): Promise<string> {
    return simpleDecrypt(encryptedData, key);
  }

  static generateSalt(): string {
    return 'demo-salt-' + Math.random().toString(36).substring(2);
  }
}