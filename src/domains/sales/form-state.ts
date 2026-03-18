import { type SaleEditorValues } from '@/src/domains/sales/types';

type NewContactField = 'contactName' | 'contactEmail' | 'contactPhone';

export function setSaleEditorValue<Key extends keyof SaleEditorValues>(
  values: SaleEditorValues,
  key: Key,
  value: SaleEditorValues[Key]
) {
  return {
    ...values,
    [key]: value,
  };
}

export function setNullableSaleEditorValue<Key extends keyof SaleEditorValues>(
  values: SaleEditorValues | null,
  key: Key,
  value: SaleEditorValues[Key]
) {
  if (!values) {
    return values;
  }

  return setSaleEditorValue(values, key, value);
}

export function clearSaleContact(values: SaleEditorValues) {
  return {
    ...values,
    contactId: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactType: 'koper' as const,
  };
}

export function clearNullableSaleContact(values: SaleEditorValues | null) {
  return values ? clearSaleContact(values) : values;
}

export function selectExistingSaleContact(values: SaleEditorValues, contactId: string) {
  return {
    ...clearSaleContact(values),
    contactId,
  };
}

export function selectExistingNullableSaleContact(
  values: SaleEditorValues | null,
  contactId: string
) {
  return values ? selectExistingSaleContact(values, contactId) : values;
}

export function updateNewSaleContactField(
  values: SaleEditorValues,
  field: NewContactField,
  value: string
) {
  return {
    ...values,
    contactId: '',
    [field]: value,
  };
}

export function updateNewNullableSaleContactField(
  values: SaleEditorValues | null,
  field: NewContactField,
  value: string
) {
  return values ? updateNewSaleContactField(values, field, value) : values;
}
