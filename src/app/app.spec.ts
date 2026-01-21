import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { AppComponent } from './app';
import { DatabaseService } from './services/database.service';

describe('AppComponent', () => {
  let spectator: Spectator<AppComponent>;
  const createComponent = createComponentFactory({
    component: AppComponent,
    mocks: [DatabaseService],
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should initialize with hasSyncedData as false', () => {
    expect(spectator.component.hasSyncedData()).toBe(false);
  });
});
