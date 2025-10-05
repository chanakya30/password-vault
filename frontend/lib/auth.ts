// Authentication and token management utilities
import { CryptoService } from './crypto';

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  requires2FA?: boolean;
}

export interface VaultAccessResponse {
  success: boolean;
  message: string;
  vaultToken?: string;
  error?: string;
}

class AuthService {
  private static instance: AuthService;
 private readonly API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Regular authentication methods
  public async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }

    return await response.json();
  }

  public async signup(email: string, password: string, masterPassword: string): Promise<AuthResponse> {
    const response = await fetch(`${this.API_BASE}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, masterPassword }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Signup failed');
    }

    return await response.json();
  }

  // Master password verification for vault access
  public async verifyMasterPassword(masterPassword: string): Promise<VaultAccessResponse> {
    const token = this.getToken();
    const userId = this.getUserId();

    if (!token || !userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${this.API_BASE}/auth/verify-master-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, masterPassword }),
    });

    return await response.json();
  }

  // Check if vault is currently unlocked
  public async checkVaultAccess(): Promise<{ vaultUnlocked: boolean; error?: string }> {
    const token = this.getToken();
    
    if (!token) {
      return { vaultUnlocked: false, error: 'No authentication token' };
    }

    try {
      const response = await fetch(`${this.API_BASE}/auth/check-vault-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return { vaultUnlocked: false, error: 'Vault access check failed' };
      }

      const data = await response.json();
      return { vaultUnlocked: data.vaultUnlocked, error: data.error };
    } catch (error) {
      return { vaultUnlocked: false, error: 'Network error during vault access check' };
    }
  }

  // Token management
  public setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  public getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  public setUserId(userId: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userId', userId);
    }
  }

  public getUserId(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userId');
    }
    return null;
  }

  // Vault token management
  public setVaultToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vaultToken', token);
    }
  }

  public getVaultToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vaultToken');
    }
    return null;
  }

  public clearVaultToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vaultToken');
    }
  }

  // Salt management for crypto operations
  public setSalt(salt: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('salt', salt);
    }
  }

  public getSalt(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('salt');
    }
    return null;
  }

  public generateAndSetSalt(): string {
    const salt = CryptoService.generateSalt();
    this.setSalt(salt);
    return salt;
  }

  // Complete authentication cleanup
  public clearAllAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('vaultToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('salt');
      localStorage.removeItem('masterPasswordSet');
    }
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return this.getToken() !== null && this.getUserId() !== null;
  }

  // Check if vault is unlocked
  public isVaultUnlocked(): boolean {
    return this.getVaultToken() !== null;
  }

  // Get authentication headers for API calls
  public getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const vaultToken = this.getVaultToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (vaultToken) {
      headers['X-Vault-Token'] = vaultToken;
    }

    return headers;
  }

  // Validate password strength
  public validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Validate master password (can have different rules)
  public validateMasterPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Master password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Master password must be less than 128 characters');
    }

    // Master password can be simpler than account password for usability
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export a singleton instance
export const authService = AuthService.getInstance();