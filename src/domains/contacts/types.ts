export const contactTypes = ['koper', 'geinteresseerde', 'galeriehouder', 'overig'] as const;
export type ContactType = (typeof contactTypes)[number];

export const contactTypeLabels: Record<ContactType, string> = {
  koper: 'Koper',
  geinteresseerde: 'Geinteresseerde',
  galeriehouder: 'Galeriehouder',
  overig: 'Overig',
};

export type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: ContactType;
  fairId: string | null;
  fairName: string | null;
  purchasedArtworkTitles: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactInterest = {
  artworkId: string;
  artworkTitle: string;
  artworkPhotoPath: string | null;
  artworkThumbnailPath: string | null;
  fairId: string | null;
  fairName: string | null;
  notes: string | null;
};

export type InterestPickerArtwork = {
  id: string;
  title: string;
  thumbnailPath: string | null;
  photoPath: string | null;
  artistName: string | null;
  status: string;
};

export type FairFilterOption = {
  id: string;
  label: string;
};

export type ContactEditorValues = {
  name: string;
  email: string;
  phone: string;
  type: ContactType;
  fairId: string;
  notes: string;
};

export const emptyContactEditorValues: ContactEditorValues = {
  name: '',
  email: '',
  phone: '',
  type: 'geinteresseerde',
  fairId: '',
  notes: '',
};

export function toContactEditorValues(contact: Contact): ContactEditorValues {
  return {
    name: contact.name,
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    type: contact.type,
    fairId: contact.fairId ?? '',
    notes: contact.notes ?? '',
  };
}

export function validateContactEditorValues(values: ContactEditorValues) {
  if (!values.name.trim()) {
    return 'Naam is verplicht.';
  }

  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    return 'Voer een geldig e-mailadres in.';
  }

  return null;
}
