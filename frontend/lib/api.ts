import { authService } from './auth';

class ApiClient {
  private readonly API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  async get(url: string) {
    const response = await fetch(`${this.API_BASE}${url}`, {
      headers: authService.getAuthHeaders(),
    });

    if (response.status === 401) {
      authService.clearVaultToken();
      throw new Error('Vault access required');
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async post(url: string, data: any) {
    const response = await fetch(`${this.API_BASE}${url}`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      authService.clearVaultToken();
      throw new Error('Vault access required');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return response.json();
  }

  async put(url: string, data: any) {
    const response = await fetch(`${this.API_BASE}${url}`, {
      method: 'PUT',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      authService.clearVaultToken();
      throw new Error('Vault access required');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return response.json();
  }

  async delete(url: string) {
    const response = await fetch(`${this.API_BASE}${url}`, {
      method: 'DELETE',
      headers: authService.getAuthHeaders(),
    });

    if (response.status === 401) {
      authService.clearVaultToken();
      throw new Error('Vault access required');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();