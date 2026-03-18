export const paymentStatuses = ['betaald', 'nog_niet_betaald', 'deels_betaald'] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  betaald: 'Betaald',
  nog_niet_betaald: 'Nog niet betaald',
  deels_betaald: 'Deels betaald',
};

export const paymentMethods = ['contant', 'pin', 'overschrijving', 'anders'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  contant: 'Contant',
  pin: 'Pin',
  overschrijving: 'Overschrijving',
  anders: 'Anders',
};

export type SaleCandidate = {
  artworkId: string;
  title: string;
  photoPath: string | null;
  thumbnailPath: string | null;
  askingPrice: number | null;
  status: string | null;
  series: string | null;
};

export type SaleListItem = {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artworkPhotoPath: string | null;
  artworkThumbnailPath: string | null;
  askingPrice: number | null;
  discount: number;
  salePrice: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  contactId: string | null;
  contactName: string | null;
  soldAt: string;
};

export type SaleEditorValues = {
  artworkId: string;
  askingPrice: string;
  discount: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactType: 'koper';
};

export const emptySaleEditorValues: SaleEditorValues = {
  artworkId: '',
  askingPrice: '',
  discount: '0',
  paymentStatus: 'betaald',
  paymentMethod: 'pin',
  contactId: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  contactType: 'koper',
};

export type SaleDetail = SaleListItem & {
  fairId: string;
  fairName: string | null;
};

export function toSaleEditorValues(sale: SaleDetail): SaleEditorValues {
  return {
    artworkId: sale.artworkId,
    askingPrice: sale.askingPrice?.toString() ?? '0',
    discount: sale.discount.toString(),
    paymentStatus: sale.paymentStatus,
    paymentMethod: sale.paymentMethod,
    contactId: sale.contactId ?? '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactType: 'koper',
  };
}

export function parseOptionalNumber(value: string) {
  const normalized = value.trim().replace(',', '.');

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function computeSalePrice(values: SaleEditorValues) {
  const askingPrice = parseOptionalNumber(values.askingPrice) ?? 0;
  const discount = parseOptionalNumber(values.discount) ?? 0;
  return Math.max(0, askingPrice - discount);
}

export function validateSaleEditorValues(values: SaleEditorValues) {
  if (!values.artworkId) {
    return 'Selecteer een kunstwerk.';
  }

  const askingPrice = parseOptionalNumber(values.askingPrice);

  if (askingPrice === null || askingPrice < 0) {
    return 'Vraagprijs moet 0 of hoger zijn.';
  }

  const discount = parseOptionalNumber(values.discount);

  if (discount === null || discount < 0) {
    return 'Korting moet 0 of hoger zijn.';
  }

  if (discount > askingPrice) {
    return 'Korting kan niet hoger zijn dan de vraagprijs.';
  }

  if (!values.contactName.trim() && (values.contactEmail.trim() || values.contactPhone.trim())) {
    return 'Vul een naam in voor het nieuwe contact of kies een bestaand contact.';
  }

  if (values.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim())) {
    return 'Voer een geldig e-mailadres in voor het contact.';
  }

  return null;
}
