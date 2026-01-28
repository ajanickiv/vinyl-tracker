import { Injectable, signal, computed } from '@angular/core';
import { DiscogsCredentials, CREDENTIALS_STORAGE_KEY } from '../models/credentials.model';

@Injectable({
  providedIn: 'root',
})
export class CredentialsService {
  private credentialsSignal = signal<DiscogsCredentials | null>(this.loadCredentials());

  readonly credentials = this.credentialsSignal.asReadonly();

  readonly hasCredentials = computed(() => {
    const creds = this.credentialsSignal();
    return creds !== null && creds.username.length > 0 && creds.token.length > 0;
  });

  constructor() {}

  /**
   * Get the stored username
   */
  getUsername(): string | null {
    return this.credentialsSignal()?.username ?? null;
  }

  /**
   * Get the stored token
   */
  getToken(): string | null {
    return this.credentialsSignal()?.token ?? null;
  }

  /**
   * Set credentials and persist to localStorage
   */
  setCredentials(credentials: DiscogsCredentials): void {
    this.credentialsSignal.set(credentials);
    this.saveCredentials();
  }

  /**
   * Clear credentials from memory and localStorage
   */
  clearCredentials(): void {
    this.credentialsSignal.set(null);
    try {
      localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear credentials:', error);
    }
  }

  /**
   * Load credentials from localStorage
   */
  private loadCredentials(): DiscogsCredentials | null {
    try {
      const stored = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.username && parsed.token) {
          return parsed as DiscogsCredentials;
        }
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
    return null;
  }

  /**
   * Save credentials to localStorage
   */
  private saveCredentials(): void {
    try {
      const creds = this.credentialsSignal();
      if (creds) {
        localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(creds));
      }
    } catch (error) {
      console.error('Failed to save credentials:', error);
    }
  }
}
