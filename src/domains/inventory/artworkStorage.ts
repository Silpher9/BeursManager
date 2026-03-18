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

const ARTWORK_IMAGE_DIRECTORY = `${documentDirectory ?? ''}artwork-images/`;
const FULL_IMAGE_MAX_DIMENSION = 1600;
const THUMBNAIL_MAX_DIMENSION = 420;
const FULL_IMAGE_QUALITY = 0.78;
const THUMBNAIL_QUALITY = 0.68;

type PersistedArtworkPhotoAssets = {
  photoPath: string;
  thumbnailPath: string | null;
};

export async function persistArtworkPhotoAsync(sourceUri: string) {
  const persisted = await persistArtworkPhotoAssetsAsync(sourceUri);
  return persisted.photoPath;
}

export async function persistArtworkPhotoAssetsAsync(
  sourceUri: string
): Promise<PersistedArtworkPhotoAssets> {
  const resizeMetadata = await getImageDimensionsAsync(sourceUri);

  if (Platform.OS === 'web') {
    return persistArtworkPhotoAssetsForWebAsync(sourceUri, resizeMetadata);
  }

  const fullResult = await manipulateArtworkImageAsync(
    sourceUri,
    resizeMetadata,
    FULL_IMAGE_MAX_DIMENSION,
    FULL_IMAGE_QUALITY
  );
  const thumbnailResult = await manipulateArtworkImageAsync(
    sourceUri,
    resizeMetadata,
    THUMBNAIL_MAX_DIMENSION,
    THUMBNAIL_QUALITY
  ).catch(() => null);

  const photoPath = await persistManipulatedImageAsync(fullResult);
  const thumbnailPath = thumbnailResult
    ? await persistManipulatedImageAsync(thumbnailResult)
    : null;

  return {
    photoPath,
    thumbnailPath,
  };
}

export async function deleteArtworkPhotoAsync(uri?: string | null) {
  if (!uri || isEmbeddedArtworkPhoto(uri) || !isManagedArtworkPhoto(uri)) {
    return;
  }

  await deleteAsync(uri, { idempotent: true });
}

export function isManagedArtworkPhoto(uri?: string | null) {
  if (isEmbeddedArtworkPhoto(uri)) {
    return true;
  }

  if (!uri || !documentDirectory) {
    return false;
  }

  return uri.startsWith(ARTWORK_IMAGE_DIRECTORY);
}

export async function artworkPhotoExistsAsync(uri?: string | null) {
  if (!uri) {
    return false;
  }

  if (isEmbeddedArtworkPhoto(uri)) {
    return true;
  }

  const info = await getInfoAsync(uri);
  return info.exists;
}

async function persistManipulatedImageAsync(result: {
  uri: string;
  base64?: string;
}) {
  if (!documentDirectory) {
    throw new Error('Lokale document directory is niet beschikbaar.');
  }

  await makeDirectoryAsync(ARTWORK_IMAGE_DIRECTORY, { intermediates: true });

  const destinationUri = `${ARTWORK_IMAGE_DIRECTORY}${randomUUID()}.jpg`;
  await copyAsync({
    from: result.uri,
    to: destinationUri,
  });

  return destinationUri;
}

function isEmbeddedArtworkPhoto(uri?: string | null) {
  return Boolean(uri?.startsWith('data:'));
}

async function persistArtworkPhotoAssetsForWebAsync(
  sourceUri: string,
  dimensions: { width: number; height: number } | null
): Promise<PersistedArtworkPhotoAssets> {
  const photoPath = await renderArtworkPhotoForWebAsync(
    sourceUri,
    dimensions,
    FULL_IMAGE_MAX_DIMENSION,
    FULL_IMAGE_QUALITY
  );
  const thumbnailPath = await renderArtworkPhotoForWebAsync(
    sourceUri,
    dimensions,
    THUMBNAIL_MAX_DIMENSION,
    THUMBNAIL_QUALITY
  ).catch(() => null);

  return {
    photoPath,
    thumbnailPath,
  };
}

async function manipulateArtworkImageAsync(
  sourceUri: string,
  dimensions: { width: number; height: number } | null,
  targetMaxDimension: number,
  quality: number
) {
  return manipulateAsync(sourceUri, buildResizeActions(dimensions, targetMaxDimension), {
    compress: quality,
    format: SaveFormat.JPEG,
    base64: Platform.OS === 'web',
  });
}

async function renderArtworkPhotoForWebAsync(
  sourceUri: string,
  dimensions: { width: number; height: number } | null,
  targetMaxDimension: number,
  quality: number
) {
  if (typeof document === 'undefined' || typeof globalThis.Image === 'undefined') {
    throw new Error('Canvas-verwerking is niet beschikbaar in deze webomgeving.');
  }

  const image = await loadImageElementForWebAsync(sourceUri);
  const targetSize = resolveTargetSize(
    dimensions ?? {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    },
    targetMaxDimension
  );
  const canvas = document.createElement('canvas');
  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas context kon niet worden aangemaakt.');
  }

  context.drawImage(image, 0, 0, targetSize.width, targetSize.height);

  const blob = await canvasToBlobAsync(canvas, quality);
  return blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Foto kon niet worden omgezet voor web-opslag.'));
    };

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

function buildResizeActions(
  dimensions: { width: number; height: number } | null,
  targetMaxDimension: number
) {
  if (!dimensions) {
    return [];
  }

  const { width, height } = dimensions;
  const largestDimension = Math.max(width, height);

  if (largestDimension <= targetMaxDimension) {
    return [];
  }

  return [
    width >= height
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
  if (Platform.OS === 'web') {
    return getImageDimensionsForWebAsync(uri);
  }

  return new Promise<{ width: number; height: number } | null>((resolve) => {
    ReactNativeImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null)
    );
  });
}

function getImageDimensionsForWebAsync(uri: string) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    if (typeof globalThis.Image === 'undefined') {
      resolve(null);
      return;
    }

    const image = new globalThis.Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    };

    image.onerror = () => {
      resolve(null);
    };

    image.src = uri;
  });
}

function loadImageElementForWebAsync(uri: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    if (typeof globalThis.Image === 'undefined') {
      reject(new Error('Image-element is niet beschikbaar in deze webomgeving.'));
      return;
    }

    const image = new globalThis.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Afbeelding kon niet geladen worden voor webverwerking.'));
    image.src = uri;
  });
}

function canvasToBlobAsync(canvas: HTMLCanvasElement, quality: number) {
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
      quality
    );
  });
}
