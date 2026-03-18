export type HomeSummary = {
  availableArtworkCount: number;
  reservedArtworkCount: number;
  upcomingFairCount: number;
};

export type HomePrimaryFair = {
  id: string;
  name: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  assignedArtworkCount: number;
  timing: 'active' | 'upcoming';
};

export type HomePrimaryFairExtended = HomePrimaryFair & {
  salesCount: number;
  salesTotal: number;
  expensesTotal: number;
  result: number;
  soldCount: number;
  reservedCount: number;
  availableCount: number;
  breakEvenProgress: number | null;
};

export type HomeRecentFairResult = {
  fairId: string;
  fairName: string;
  fairEndDate: string;
  salesCount: number;
  salesTotal: number;
};
