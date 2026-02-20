import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { syncGuard, playerGuard } from './app.guards';
import { CredentialsService } from './credentials.service';
import { DatabaseService } from './database.service';

describe('syncGuard', () => {
  let mockCredentialsService: { hasCredentials: jest.Mock };
  let mockRouter: { createUrlTree: jest.Mock; navigate: jest.Mock };

  beforeEach(() => {
    mockCredentialsService = { hasCredentials: jest.fn() };
    mockRouter = {
      createUrlTree: jest.fn((commands) => ({ commands }) as unknown as UrlTree),
      navigate: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: CredentialsService, useValue: mockCredentialsService },
        { provide: DatabaseService, useValue: {} },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should return true when credentials exist', () => {
    mockCredentialsService.hasCredentials.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => syncGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('should redirect to /setup when no credentials', () => {
    mockCredentialsService.hasCredentials.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => syncGuard({} as any, {} as any));

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/setup']);
    expect(result).not.toBe(true);
  });
});

describe('playerGuard', () => {
  let mockCredentialsService: { hasCredentials: jest.Mock };
  let mockDatabaseService: { getCollectionCount: jest.Mock };
  let mockRouter: { createUrlTree: jest.Mock; navigate: jest.Mock };

  beforeEach(() => {
    mockCredentialsService = { hasCredentials: jest.fn() };
    mockDatabaseService = { getCollectionCount: jest.fn() };
    mockRouter = {
      createUrlTree: jest.fn((commands) => ({ commands }) as unknown as UrlTree),
      navigate: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: CredentialsService, useValue: mockCredentialsService },
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should redirect to /setup when no credentials', async () => {
    mockCredentialsService.hasCredentials.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() => playerGuard({} as any, {} as any));

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/setup']);
    expect(result).not.toBe(true);
  });

  it('should redirect to /sync when credentials exist but no data', async () => {
    mockCredentialsService.hasCredentials.mockReturnValue(true);
    mockDatabaseService.getCollectionCount.mockResolvedValue(0);

    const result = await TestBed.runInInjectionContext(() => playerGuard({} as any, {} as any));

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/sync']);
    expect(result).not.toBe(true);
  });

  it('should return true when credentials and data exist', async () => {
    mockCredentialsService.hasCredentials.mockReturnValue(true);
    mockDatabaseService.getCollectionCount.mockResolvedValue(5);

    const result = await TestBed.runInInjectionContext(() => playerGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('should not check database when no credentials', async () => {
    mockCredentialsService.hasCredentials.mockReturnValue(false);

    await TestBed.runInInjectionContext(() => playerGuard({} as any, {} as any));

    expect(mockDatabaseService.getCollectionCount).not.toHaveBeenCalled();
  });
});
