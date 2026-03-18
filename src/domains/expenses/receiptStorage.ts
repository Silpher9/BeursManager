import { randomUUID } from 'expo-crypto';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import { Image as ReactNativeImage, Platform } from 'react-native';

const RECEIPT_IMAGE_DIRECTORY = `${documentDirectory ?? ''}receipt-images/`;
const MAX_DIMENSION = 2000;
const IMAGE_QUALITY = 0.88;

export async function persistReceiptPhotoAsync(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return persistReceiptPhotoForWebAsync(sourceUri);
  }

  const dimensions = await getImageDimensionsAsync(sourceUri);
  const result = await manipulateAsync(
    sourceUri,
    buildResizeActions(dimensions, MAX_DIMENSION),
    {
      compress: IMAGE_QUALITY,
      format: SaveFormat.JPEG,
    }
  );

  return persistToDirectoryAsync(result.uri);
}

export async function deleteReceiptPhotoAsync(uri: string | null): Promise<void> {
  if (!uri || uri.startsWith('data:')) {
    return;
  }

  if (!documentDirectory || !uri.startsWith(RECEIPT_IMAGE_DIRECTORY)) {
    return;
  }

  await deleteAsync(uri, { idempotent: true });
}

export async function receiptPhotoExistsAsync(uri?: string | null) {
  if (!uri) {
    return false;
  }

  if (uri.startsWith('data:')) {
    return true;
  }

  const info = await getInfoAsync(uri);
  return info.exists;
}

async function persistToDirectoryAsync(sourceUri: string) {
  if (!documentDirectory) {
    throw new Error('Lokale document directory is niet beschikbaar.');
  }

  await makeDirectoryAsync(RECEIPT_IMAGE_DIRECTORY, { intermediates: true });

  const destinationUri = `${RECEIPT_IMAGE_DIRECTORY}${randomUUID()}.jpg`;
  await copyAsync({ from: sourceUri, to: destinationUri });

  return destinationUri;
}

async function persistReceiptPhotoForWebAsync(sourceUri: string): Promise<string> {
  if (typeof document === 'undefined' || typeof globalThis.Image === 'undefined') {
    throw new Error('Canvas-verwerking is niet beschikbaar in deze webomgeving.');
  }

  const image = await loadImageElementAsync(sourceUri);
  const dimensions = {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
  const targetSize = resolveTargetSize(dimensions, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context kon niet worden aangemaakt.');
  }

  context.drawImage(image, 0, 0, targetSize.width, targetSize.height);

  const blob = await canvasToBlobAsync(canvas);
  return blobToDataUrl(blob);
}

function buildResizeActions(
  dimensions: { width: number; height: number } | null,
  targetMaxDimension: number
) {
  if (!dimensions) {
    return [];
  }

  const largestDimension = Math.max(dimensions.width, dimensions.height);

  if (largestDimension <= targetMaxDimension) {
    return [];
  }

  return [
    dimensions.width >= dimensions.height
      ? { resize: { width: targetMaxDimension } }
      : { resize: { height: targetMaxDimension } },
  ];
}

function resolveTargetSize(
  dimensions: { width: number; height: number },
  targetMaxDimension: number
) {
  const largestDimension = Math.max(dimensions.width, dimensions.height);

  if (largestDimension <= targetMaxDimension) {
    return dimensions;
  }

  const scale = targetMaxDimension / largestDimension;

  return {
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale)),
  };
}

function getImageDimensionsAsync(uri: string) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    ReactNativeImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null)
    );
  });
}

function loadImageElementAsync(uri: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    if (typeof globalThis.Image === 'undefined') {
      reject(new Error('Image-element is niet beschikbaar in deze webomgeving.'));
      return;
    }

    const image = new globalThis.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Afbeelding kon niet geladen worden.'));
    image.src = uri;
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Foto kon niet worden omgezet voor web-opslag.'));
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Fotoformaat voor web-opslag is ongeldig.'));
    };
    reader.readAsDataURL(blob);
  });
}

function canvasToBlobAsync(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas kon niet worden opgeslagen als blob.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      IMAGE_QUALITY
    );
  });
}
