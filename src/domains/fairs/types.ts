export type Fair = {
  id: string;
  name: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FairListItem = Fair & {
  assignedArtworkCount: number;
};

export type FairEditorValues = {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export type FairAssignmentItem = {
  artworkId: string;
  title: string;
  artistName: string | null;
  photoPath: string | null;
  thumbnailPath: string | null;
  status: string | null;
  askingPrice: number | null;
  series: string | null;
  included: boolean;
  sold: boolean;
  salePrice: number | null;
};

export const emptyFairEditorValues: FairEditorValues = {
  name: '',
  location: '',
  startDate: '',
  endDate: '',
  notes: '',
};

export function toFairEditorValues(fair: Fair): FairEditorValues {
  return {
    name: fair.name,
    location: fair.location ?? '',
    startDate: fair.startDate ?? '',
    endDate: fair.endDate ?? '',
    notes: fair.notes ?? '',
  };
}

export function validateFairEditorValues(values: FairEditorValues) {
  if (!values.name.trim()) {
    return 'Naam is verplicht.';
  }

  if (values.startDate.trim() && !isIsoDate(values.startDate)) {
    return 'Startdatum moet in formaat YYYY-MM-DD staan.';
  }

  if (values.endDate.trim() && !isIsoDate(values.endDate)) {
    return 'Einddatum moet in formaat YYYY-MM-DD staan.';
  }

  if (values.startDate.trim() && values.endDate.trim() && values.endDate < values.startDate) {
    return 'Einddatum kan niet voor de startdatum liggen.';
  }

  return null;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}
