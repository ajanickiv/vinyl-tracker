import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { SetupScreenComponent } from './setup-screen.component';
import { CredentialsService } from '../../services/credentials.service';
import { DatabaseService } from '../../services/database.service';

describe('SetupScreenComponent', () => {
  let spectator: Spectator<SetupScreenComponent>;
  const createComponent = createComponentFactory({
    component: SetupScreenComponent,
    mocks: [CredentialsService, DatabaseService],
  });

  beforeEach(() => {
    spectator = createComponent();
    const db = spectator.inject(DatabaseService);
    db.getCollectionCount.mockResolvedValue(0);
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should initialize with empty username and token', () => {
    expect(spectator.component.username()).toBe('');
    expect(spectator.component.token()).toBe('');
  });

  it('should initialize with token hidden', () => {
    expect(spectator.component.showToken()).toBe(false);
  });

  it('should initialize with no error message', () => {
    expect(spectator.component.errorMessage()).toBe('');
  });

  describe('hasExistingData', () => {
    it('should be false when no data exists', async () => {
      const db = spectator.inject(DatabaseService);
      db.getCollectionCount.mockResolvedValue(0);

      await spectator.component.ngOnInit();

      expect(spectator.component.hasExistingData()).toBe(false);
    });

    it('should be true when data exists', async () => {
      const db = spectator.inject(DatabaseService);
      db.getCollectionCount.mockResolvedValue(100);

      await spectator.component.ngOnInit();

      expect(spectator.component.hasExistingData()).toBe(true);
    });
  });

  describe('onUsernameChange', () => {
    it('should update username signal', () => {
      spectator.component.onUsernameChange('testuser');

      expect(spectator.component.username()).toBe('testuser');
    });

    it('should clear error message', () => {
      spectator.component.errorMessage.set('Some error');

      spectator.component.onUsernameChange('testuser');

      expect(spectator.component.errorMessage()).toBe('');
    });
  });

  describe('onTokenChange', () => {
    it('should update token signal', () => {
      spectator.component.onTokenChange('testtoken');

      expect(spectator.component.token()).toBe('testtoken');
    });

    it('should clear error message', () => {
      spectator.component.errorMessage.set('Some error');

      spectator.component.onTokenChange('testtoken');

      expect(spectator.component.errorMessage()).toBe('');
    });
  });

  describe('toggleShowToken', () => {
    it('should toggle showToken from false to true', () => {
      expect(spectator.component.showToken()).toBe(false);

      spectator.component.toggleShowToken();

      expect(spectator.component.showToken()).toBe(true);
    });

    it('should toggle showToken from true to false', () => {
      spectator.component.showToken.set(true);

      spectator.component.toggleShowToken();

      expect(spectator.component.showToken()).toBe(false);
    });
  });

  describe('submit', () => {
    it('should show error when username is empty', () => {
      spectator.component.username.set('');
      spectator.component.token.set('validtoken');

      spectator.component.submit();

      expect(spectator.component.errorMessage()).toBe('Username is required');
    });

    it('should show error when username is only whitespace', () => {
      spectator.component.username.set('   ');
      spectator.component.token.set('validtoken');

      spectator.component.submit();

      expect(spectator.component.errorMessage()).toBe('Username is required');
    });

    it('should show error when token is empty', () => {
      spectator.component.username.set('validuser');
      spectator.component.token.set('');

      spectator.component.submit();

      expect(spectator.component.errorMessage()).toBe('Personal access token is required');
    });

    it('should show error when token is only whitespace', () => {
      spectator.component.username.set('validuser');
      spectator.component.token.set('   ');

      spectator.component.submit();

      expect(spectator.component.errorMessage()).toBe('Personal access token is required');
    });

    it('should save credentials when both fields are valid', () => {
      const credentialsService = spectator.inject(CredentialsService);
      spectator.component.username.set('testuser');
      spectator.component.token.set('testtoken');

      spectator.component.submit();

      expect(credentialsService.setCredentials).toHaveBeenCalledWith({
        username: 'testuser',
        token: 'testtoken',
      });
    });

    it('should trim whitespace from credentials before saving', () => {
      const credentialsService = spectator.inject(CredentialsService);
      spectator.component.username.set('  testuser  ');
      spectator.component.token.set('  testtoken  ');

      spectator.component.submit();

      expect(credentialsService.setCredentials).toHaveBeenCalledWith({
        username: 'testuser',
        token: 'testtoken',
      });
    });

    it('should emit setupComplete when credentials are saved', () => {
      const setupCompleteSpy = jest.fn();
      spectator.component.setupComplete.subscribe(setupCompleteSpy);
      spectator.component.username.set('testuser');
      spectator.component.token.set('testtoken');

      spectator.component.submit();

      expect(setupCompleteSpy).toHaveBeenCalledTimes(1);
    });

    it('should not emit setupComplete when validation fails', () => {
      const setupCompleteSpy = jest.fn();
      spectator.component.setupComplete.subscribe(setupCompleteSpy);
      spectator.component.username.set('');
      spectator.component.token.set('testtoken');

      spectator.component.submit();

      expect(setupCompleteSpy).not.toHaveBeenCalled();
    });

    it('should not save credentials when validation fails', () => {
      const credentialsService = spectator.inject(CredentialsService);
      spectator.component.username.set('');
      spectator.component.token.set('testtoken');

      spectator.component.submit();

      expect(credentialsService.setCredentials).not.toHaveBeenCalled();
    });
  });
});
