import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';

export async function toUploadFile(asset: ImagePickerAsset) {
  const uri = asset.uri;
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const safeExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
  const name = asset.fileName || `upload-${Date.now()}.${safeExtension}`;
  const type = asset.mimeType || (safeExtension === 'png' ? 'image/png' : safeExtension === 'webp' ? 'image/webp' : 'image/jpeg');

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new File([blob], name, { type });
  }

  return { uri, name, type } as any;
}