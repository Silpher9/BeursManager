import { describe, expect, it } from 'vitest';

import { validateContactEditorValues } from '@/src/domains/contacts/types';
import { validateFairEditorValues } from '@/src/domains/fairs/types';
import {
  computeSalePrice,
  parseOptionalNumber,
  validateSaleEditorValues,
} from '@/src/domains/sales/types';
import { formatPrice } from '@/src/shared/formatters';

describe('validators and formatters', () => {
  it('rejects an empty fair name', () => {
    expect(
      validateFairEditorValues({
        name: '  ',
        location: '',
        startDate: '',
        endDate: '',
        notes: '',
      })
    ).toBe('Naam is verplicht.');
  });

  it('rejects an invalid fair date order', () => {
    expect(
      validateFairEditorValues({
        name: 'Voorjaarsbeurs',
        location: 'Utrecht',
        startDate: '2026-03-15',
        endDate: '2026-03-14',
        notes: '',
      })
    ).toBe('Einddatum kan niet voor de startdatum liggen.');
  });

  it('rejects an invalid contact email address', () => {
    expect(
      validateContactEditorValues({
        name: 'Emma',
        email: 'niet-geldig',
        phone: '',
        type: 'koper',
        fairId: '',
        notes: '',
      })
    ).toBe('Voer een geldig e-mailadres in.');
  });

  it('parses optional sale numbers consistently', () => {
    expect(parseOptionalNumber('12,5')).toBe(12.5);
    expect(parseOptionalNumber('')).toBeNull();
  });

  it('never computes a negative sale price', () => {
    expect(
      computeSalePrice({
        artworkId: 'art-1',
        askingPrice: '1000',
        discount: '1400',
        paymentStatus: 'betaald',
        paymentMethod: 'pin',
        contactId: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        contactType: 'koper',
      })
    ).toBe(0);
  });

  it('rejects a sale discount above the asking price', () => {
    expect(
      validateSaleEditorValues({
        artworkId: 'art-1',
        askingPrice: '1000',
        discount: '1200',
        paymentStatus: 'betaald',
        paymentMethod: 'pin',
        contactId: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        contactType: 'koper',
      })
    ).toBe('Korting kan niet hoger zijn dan de vraagprijs.');
  });

  it('formats euro amounts and respects fallbacks', () => {
    expect(formatPrice(1250)).toBe('\u20ac\u00a01.250');
    expect(formatPrice(null, 'Nog leeg')).toBe('Nog leeg');
  });
});
