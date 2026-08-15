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
