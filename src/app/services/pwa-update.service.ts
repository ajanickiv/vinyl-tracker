import { Injectable, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first } from 'rxjs/operators';
import { concat, interval } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {
  constructor(
    private swUpdate: SwUpdate,
    private appRef: ApplicationRef,
  ) {}

  /**
   * Initialize update checking.
   * Call this from AppComponent.ngOnInit()
   */
  initialize(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.setupPeriodicUpdateCheck();

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        this.promptUserToUpdate();
      });
  }

  private setupPeriodicUpdateCheck(): void {
    const appIsStable$ = this.appRef.isStable.pipe(first((isStable) => isStable));
    const everySixHours$ = interval(6 * 60 * 60 * 1000);
    const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

    everySixHoursOnceAppIsStable$.subscribe(async () => {
      try {
        await this.swUpdate.checkForUpdate();
      } catch {
        // Update check failed - network unavailable or other issue
      }
    });
  }

  private promptUserToUpdate(): void {
    const shouldUpdate = confirm('A new version of VinylTracker is available. Reload to update?');

    if (shouldUpdate) {
      this.activateUpdate();
    }
  }

  async activateUpdate(): Promise<void> {
    await this.swUpdate.activateUpdate();
    document.location.reload();
  }
}
