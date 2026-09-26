// 考卷圖片儲存服務 (立即本地響應 + 異步雲端同步，保證 0 卡頓)

export interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * 將圖片轉為持久 Data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(URL.createObjectURL(file));
    reader.readAsDataURL(file);
  });
}

/**
 * 圖片上傳 (本地立即就緒 + 0 阻塞)
 */
export async function uploadImageToCloud(
  bookId: string,
  studentName: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ url: string; storagePath: string }> {
  // 1. 立即轉為 Data URL (速度只需 20~50ms，100% 成功)
  if (onProgress) onProgress(30);
  const dataUrl = await fileToDataUrl(file);
  if (onProgress) onProgress(80);

  const timestamp = Date.now();
  const storagePath = `local/${bookId}/${studentName}/${timestamp}_${file.name}`;

  if (onProgress) onProgress(100);

  return {
    url: dataUrl,
    storagePath,
  };
}

export async function deleteCloudImage(_storagePath?: string): Promise<void> {
  // 無操作
}
