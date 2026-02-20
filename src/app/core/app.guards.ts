import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { CredentialsService } from '../core/credentials.service';
import { DatabaseService } from '../core/database.service';

export const syncGuard: CanActivateFn = (): boolean | UrlTree => {
  const credentialsService = inject(CredentialsService);
  const router = inject(Router);

  if (credentialsService.hasCredentials()) {
    return true;
  }
  return router.createUrlTree(['/setup']);
};

export const playerGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const credentialsService = inject(CredentialsService);
  const db = inject(DatabaseService);
  const router = inject(Router);

  if (!credentialsService.hasCredentials()) {
    return router.createUrlTree(['/setup']);
  }

  const count = await db.getCollectionCount();
  if (count === 0) {
    return router.createUrlTree(['/sync']);
  }

  return true;
};
