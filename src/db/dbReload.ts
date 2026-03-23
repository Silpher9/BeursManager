let reloadCallback: (() => void) | null = null;
let maintenanceCallback: ((active: boolean) => void) | null = null;
let maintenanceResolve: (() => void) | null = null;

export function setDatabaseReloadCallback(cb: () => void) {
  reloadCallback = cb;
}

export function setMaintenanceCallback(cb: (active: boolean) => void) {
  maintenanceCallback = cb;
}

export function triggerDatabaseReload() {
  reloadCallback?.();
}

export function setMaintenanceMode(active: boolean): Promise<void> {
  return new Promise((resolve) => {
    maintenanceResolve = resolve;
    maintenanceCallback?.(active);
  });
}

export function confirmMaintenanceTransition() {
  maintenanceResolve?.();
  maintenanceResolve = null;
}
