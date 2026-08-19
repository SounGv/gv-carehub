export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

const COMPRESS_MAX_DIMENSION = 1600;
const COMPRESS_JPEG_QUALITY = 0.82;
// Phone-camera photos routinely run 3-8MB; base64-encoding and uploading them
// as-is (through an Apps Script Web App with real per-call overhead) is what
// made claim submission feel stuck on a spinner. Re-encoding down to a
// reasonable size for a defect photo cuts that payload by 10-20x. Already-small
// images are left alone — re-encoding them only burns CPU for no size gain.
const SKIP_COMPRESSION_UNDER_BYTES = 400 * 1024;

export interface CompressedImage {
  base64: string;
  mimeType: string;
  filename: string;
}

export function compressImageForUpload(file: File): Promise<CompressedImage> {
  if (file.size <= SKIP_COMPRESSION_UNDER_BYTES) {
    return fileToBase64(file).then((base64) => ({ base64, mimeType: file.type || 'image/jpeg', filename: file.name }));
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const fallbackToOriginal = () => {
      URL.revokeObjectURL(objectUrl);
      fileToBase64(file).then((base64) => resolve({ base64, mimeType: file.type || 'image/jpeg', filename: file.name }));
    };

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > COMPRESS_MAX_DIMENSION || height > COMPRESS_MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * COMPRESS_MAX_DIMENSION) / width);
          width = COMPRESS_MAX_DIMENSION;
        } else {
          width = Math.round((width * COMPRESS_MAX_DIMENSION) / height);
          height = COMPRESS_MAX_DIMENSION;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        fallbackToOriginal();
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', COMPRESS_JPEG_QUALITY);
      const base64 = dataUrl.split(',')[1] ?? '';
      const filename = file.name.replace(/\.\w+$/, '') + '.jpg';
      resolve({ base64, mimeType: 'image/jpeg', filename });
    };
    img.onerror = fallbackToOriginal;
    img.src = objectUrl;
  });
}
