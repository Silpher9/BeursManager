let reloadCallback: (() => void) | null = null;

export function setDatabaseReloadCallback(cb: () => void) {
  reloadCallback = cb;
}

export function triggerDatabaseReload() {
  reloadCallback?.();
}
