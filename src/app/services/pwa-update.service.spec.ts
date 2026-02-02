import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subject, BehaviorSubject } from 'rxjs';
import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  let service: PwaUpdateService;
  let swUpdateMock: {
    isEnabled: boolean;
    versionUpdates: Subject<VersionReadyEvent>;
    checkForUpdate: jest.Mock;
    activateUpdate: jest.Mock;
  };
  let appRefMock: {
    isStable: BehaviorSubject<boolean>;
  };

  beforeEach(() => {
    swUpdateMock = {
      isEnabled: true,
      versionUpdates: new Subject(),
      checkForUpdate: jest.fn().mockResolvedValue(false),
      activateUpdate: jest.fn().mockResolvedValue(true),
    };

    appRefMock = {
      isStable: new BehaviorSubject(false),
    };

    TestBed.configureTestingModule({
      providers: [
        PwaUpdateService,
        { provide: SwUpdate, useValue: swUpdateMock },
        { provide: ApplicationRef, useValue: appRefMock },
      ],
    });

    service = TestBed.inject(PwaUpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not set up update checks if service worker is disabled', () => {
    swUpdateMock.isEnabled = false;
    service.initialize();
    appRefMock.isStable.next(true);
    expect(swUpdateMock.checkForUpdate).not.toHaveBeenCalled();
  });

  it('should check for updates when app becomes stable', fakeAsync(() => {
    service.initialize();
    expect(swUpdateMock.checkForUpdate).not.toHaveBeenCalled();

    appRefMock.isStable.next(true);
    tick();

    expect(swUpdateMock.checkForUpdate).toHaveBeenCalledTimes(1);
  }));

  it('should prompt user when new version is ready', fakeAsync(() => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    service.initialize();

    const versionEvent: VersionReadyEvent = {
      type: 'VERSION_READY',
      currentVersion: { hash: 'abc123' },
      latestVersion: { hash: 'def456' },
    };

    swUpdateMock.versionUpdates.next(versionEvent);
    tick();

    expect(confirmSpy).toHaveBeenCalledWith(
      'A new version of VinylTracker is available. Reload to update?',
    );

    confirmSpy.mockRestore();
  }));

  it('should call activateUpdate when user confirms', fakeAsync(() => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    service.initialize();

    const versionEvent: VersionReadyEvent = {
      type: 'VERSION_READY',
      currentVersion: { hash: 'abc123' },
      latestVersion: { hash: 'def456' },
    };

    swUpdateMock.versionUpdates.next(versionEvent);
    tick();
    flush();

    expect(swUpdateMock.activateUpdate).toHaveBeenCalled();

    confirmSpy.mockRestore();
  }));

  it('should not activate update when user cancels', fakeAsync(() => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    service.initialize();

    const versionEvent: VersionReadyEvent = {
      type: 'VERSION_READY',
      currentVersion: { hash: 'abc123' },
      latestVersion: { hash: 'def456' },
    };

    swUpdateMock.versionUpdates.next(versionEvent);
    tick();

    expect(swUpdateMock.activateUpdate).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  }));
});
