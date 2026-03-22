export type BackupManifest = {
  version: 1;
  createdAt: string;
  appVersion: string;
  dbVersion: number;
  stats: BackupStats;
};

export type BackupStats = {
  artworks: number;
  fairs: number;
  expenses: number;
  contacts: number;
  sales: number;
  artworkImageCount: number;
  receiptImageCount: number;
};

export type BackupValidationResult =
  | { valid: true; manifest: BackupManifest }
  | { valid: false; error: string };

export type BackupProgress = {
  phase: string;
  message: string;
};
