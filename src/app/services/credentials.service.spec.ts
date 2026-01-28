import { TestBed } from '@angular/core/testing';
import { CredentialsService } from './credentials.service';
import { CREDENTIALS_STORAGE_KEY } from '../models/credentials.model';

describe('CredentialsService', () => {
  let service: CredentialsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CredentialsService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with null credentials when localStorage is empty', () => {
      expect(service.credentials()).toBeNull();
    });

    it('should load credentials from localStorage if available', () => {
      const storedCredentials = {
        username: 'testuser',
        token: 'testtoken123',
      };
      localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(storedCredentials));

      const newService = new CredentialsService();

      expect(newService.credentials()).toEqual(storedCredentials);
      expect(newService.getUsername()).toBe('testuser');
      expect(newService.getToken()).toBe('testtoken123');
    });

    it('should handle invalid localStorage data gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      localStorage.setItem(CREDENTIALS_STORAGE_KEY, 'invalid json');

      const newService = new CredentialsService();

      expect(newService.credentials()).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load credentials:',
        expect.any(SyntaxError)
      );
      consoleSpy.mockRestore();
    });

    it('should return null for incomplete credentials in localStorage', () => {
      localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify({ username: 'only-user' }));

      const newService = new CredentialsService();

      expect(newService.credentials()).toBeNull();
    });
  });

  describe('hasCredentials', () => {
    it('should return false when no credentials are set', () => {
      expect(service.hasCredentials()).toBe(false);
    });

    it('should return true when valid credentials are set', () => {
      service.setCredentials({ username: 'testuser', token: 'testtoken' });

      expect(service.hasCredentials()).toBe(true);
    });

    it('should return false when username is empty', () => {
      service.setCredentials({ username: '', token: 'testtoken' });

      expect(service.hasCredentials()).toBe(false);
    });

    it('should return false when token is empty', () => {
      service.setCredentials({ username: 'testuser', token: '' });

      expect(service.hasCredentials()).toBe(false);
    });
  });

  describe('getUsername', () => {
    it('should return null when no credentials are set', () => {
      expect(service.getUsername()).toBeNull();
    });

    it('should return the username when credentials are set', () => {
      service.setCredentials({ username: 'myuser', token: 'mytoken' });

      expect(service.getUsername()).toBe('myuser');
    });
  });

  describe('getToken', () => {
    it('should return null when no credentials are set', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should return the token when credentials are set', () => {
      service.setCredentials({ username: 'myuser', token: 'mytoken' });

      expect(service.getToken()).toBe('mytoken');
    });
  });

  describe('setCredentials', () => {
    it('should update the credentials signal', () => {
      service.setCredentials({ username: 'newuser', token: 'newtoken' });

      expect(service.credentials()).toEqual({ username: 'newuser', token: 'newtoken' });
    });

    it('should persist credentials to localStorage', () => {
      service.setCredentials({ username: 'saveduser', token: 'savedtoken' });

      const stored = JSON.parse(localStorage.getItem(CREDENTIALS_STORAGE_KEY)!);
      expect(stored).toEqual({ username: 'saveduser', token: 'savedtoken' });
    });

    it('should overwrite existing credentials', () => {
      service.setCredentials({ username: 'user1', token: 'token1' });
      service.setCredentials({ username: 'user2', token: 'token2' });

      expect(service.credentials()).toEqual({ username: 'user2', token: 'token2' });
    });
  });

  describe('clearCredentials', () => {
    it('should set credentials to null', () => {
      service.setCredentials({ username: 'testuser', token: 'testtoken' });

      service.clearCredentials();

      expect(service.credentials()).toBeNull();
    });

    it('should remove credentials from localStorage', () => {
      service.setCredentials({ username: 'testuser', token: 'testtoken' });

      service.clearCredentials();

      expect(localStorage.getItem(CREDENTIALS_STORAGE_KEY)).toBeNull();
    });

    it('should set hasCredentials to false', () => {
      service.setCredentials({ username: 'testuser', token: 'testtoken' });
      expect(service.hasCredentials()).toBe(true);

      service.clearCredentials();

      expect(service.hasCredentials()).toBe(false);
    });
  });
});
