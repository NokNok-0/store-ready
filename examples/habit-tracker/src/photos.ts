import { File } from 'expo-file-system';
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
  type ImagePickerOptions,
} from 'expo-image-picker';

export type PhotoSource = 'camera' | 'library';

export type PhotoResult =
  | { status: 'picked'; uri: string }
  | { status: 'cancelled' }
  | { status: 'denied' };

const options: ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

export async function pickPhoto(source: PhotoSource): Promise<PhotoResult> {
  const permission =
    source === 'camera'
      ? await requestCameraPermissionsAsync()
      : await requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { status: 'denied' };
  }
  const result =
    source === 'camera' ? await launchCameraAsync(options) : await launchImageLibraryAsync(options);
  if (result.canceled) {
    return { status: 'cancelled' };
  }
  return { status: 'picked', uri: result.assets[0].uri };
}

export function deletePhotos(uris: readonly string[]): void {
  for (const uri of uris) {
    if (!uri.startsWith('file://')) {
      continue;
    }
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  }
}
