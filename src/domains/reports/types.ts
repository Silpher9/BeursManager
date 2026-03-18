/** Totaaloverzicht over alle (gefilterde) beurzen */
export type ReportSummary = {
  fairCount: number;
  salesCount: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  averageRevenuePerFair: number;
};

/** Een rij in de beurs-vergelijkingstabel */
export type FairReportRow = {
  fairId: string;
  fairName: string;
  startDate: string | null;
  endDate: string | null;
  salesCount: number;
  revenue: number;
  expenses: number;
  profit: number;
};

/** Een rij in de techniek-ranking */
export type TechniqueReportRow = {
  technique: string;
  salesCount: number;
  totalRevenue: number;
};

/** Een rij in de top-verkopen lijst */
export type TopArtworkRow = {
  artworkId: string;
  artworkTitle: string;
  technique: string | null;
  thumbnailPath: string | null;
  photoPath: string | null;
  salePrice: number;
  fairName: string;
  soldAt: string;
};

/** Complete rapportdata */
export type ReportData = {
  summary: ReportSummary;
  fairRows: FairReportRow[];
  techniqueRows: TechniqueReportRow[];
  topArtworks: TopArtworkRow[];
  availableYears: number[];
};
