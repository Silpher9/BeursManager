export const artworkStatuses = [
  'beschikbaar',
  'gereserveerd',
  'ingepakt',
  'op_beurs',
  'verkocht',
] as const;

export type ArtworkStatus = (typeof artworkStatuses)[number];

export const artworkStatusLabels: Record<ArtworkStatus, string> = {
  beschikbaar: 'Beschikbaar',
  gereserveerd: 'Gereserveerd',
  ingepakt: 'Ingepakt',
  op_beurs: 'Op beurs',
  verkocht: 'Verkocht',
};

export type Artwork = {
  id: string;
  artistId: string | null;
  artistName: string | null;
  photoPath: string | null;
  thumbnailPath: string | null;
  extraPhotoPaths: string[];
  title: string;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  askingPrice: number | null;
  technique: string | null;
  year: number | null;
  series: string | null;
  status: ArtworkStatus;
  createdAt: string;
  updatedAt: string;
};

export type ArtworkEditorValues = {
  artistName: string;
  photoPath: string | null;
  thumbnailPath: string | null;
  title: string;
  heightCm: string;
  widthCm: string;
  depthCm: string;
  askingPrice: string;
  technique: string;
  year: string;
  series: string;
  status: ArtworkStatus;
};

export type ArtworkListFilters = {
  status?: ArtworkStatus | 'all';
  series?: string | 'all';
  artistId?: string | 'all';
};

export type ArtistOption = {
  id: string;
  name: string;
};

export const emptyArtworkEditorValues: ArtworkEditorValues = {
  artistName: '',
  photoPath: null,
  thumbnailPath: null,
  title: '',
  heightCm: '',
  widthCm: '',
  depthCm: '',
  askingPrice: '',
  technique: '',
  year: '',
  series: '',
  status: 'beschikbaar',
};

export function toArtworkEditorValues(artwork: Artwork): ArtworkEditorValues {
  return {
    artistName: artwork.artistName ?? '',
    photoPath: artwork.photoPath,
    thumbnailPath: artwork.thumbnailPath,
    title: artwork.title,
    heightCm: artwork.heightCm?.toString() ?? '',
    widthCm: artwork.widthCm?.toString() ?? '',
    depthCm: artwork.depthCm?.toString() ?? '',
    askingPrice: artwork.askingPrice?.toString() ?? '',
    technique: artwork.technique ?? '',
    year: artwork.year?.toString() ?? '',
    series: artwork.series ?? '',
    status: artwork.status,
  };
}

export function validateArtworkEditorValues(values: ArtworkEditorValues) {
  const currentYear = new Date().getFullYear() + 1;
  const dimensions = [
    { label: 'Hoogte', value: values.heightCm },
    { label: 'Breedte', value: values.widthCm },
    { label: 'Diepte', value: values.depthCm },
  ];

  if (!values.title.trim()) {
    return 'Titel is verplicht.';
  }

  for (const dimension of dimensions) {
    if (!dimension.value.trim()) {
      continue;
    }

    const normalized = Number(dimension.value.trim().replace(',', '.'));

    if (!Number.isFinite(normalized) || normalized <= 0) {
      return `${dimension.label} moet groter zijn dan 0.`;
    }
  }

  if (values.askingPrice.trim()) {
    const normalizedPrice = Number(values.askingPrice.trim().replace(',', '.'));

    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      return 'Vraagprijs moet 0 of hoger zijn.';
    }
  }

  if (values.year.trim()) {
    const normalizedYear = Number.parseInt(values.year.trim(), 10);

    if (!Number.isFinite(normalizedYear) || normalizedYear < 1000 || normalizedYear > currentYear) {
      return `Jaar moet tussen 1000 en ${currentYear} liggen.`;
    }
  }

  return null;
}
