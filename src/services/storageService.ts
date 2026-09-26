import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../config/firebase';

export interface UploadProgressCallback {
  (progress: number): void;
}

// 記錄 Storage 權限狀態
export let isStoragePermissionDenied = false;

/**
 * 將圖片上傳到 Firebase Storage (CDN 公開網址，跨裝置秒開)
 * 若 Storage 權限未開，降級為高畫質 DataURL 並記錄警告
 */
export async function uploadImageToCloud(
  bookId: string,
  studentName: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ url: string; storagePath: string }> {
  const timestamp = Date.now();
  const cleanStudentName = studentName.trim() || '未分類學生';
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\u4e00-\u9fa5_-]/g, '_');
  const storagePath = `score_flipbooks/${bookId}/${cleanStudentName}/${timestamp}_${cleanFileName}`;

  // 1. 優先嘗試上傳至 Firebase Storage (取得跨裝置通用 CDN 下載網址)
  if (isFirebaseConfigured && storage && !isStoragePermissionDenied) {
    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'image/jpeg',
      });

      return await new Promise((resolve) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          },
          async (error) => {
            console.warn('⚠️ Firebase Storage 權限未開放 (Permission Denied)，降級為本地存儲：', error.message);
            isStoragePermissionDenied = true;
            const dataUrl = await fileToDataUrl(file);
            if (onProgress) onProgress(100);
            resolve({
              url: dataUrl,
              storagePath: `local/${storagePath}`,
            });
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              resolve({
                url: downloadUrl,
                storagePath,
              });
            } catch {
              const dataUrl = await fileToDataUrl(file);
              if (onProgress) onProgress(100);
              resolve({
                url: dataUrl,
                storagePath: `local/${storagePath}`,
              });
            }
          }
        );
      });
    } catch (err: any) {
      console.warn('Storage 例外回退：', err.message);
      isStoragePermissionDenied = true;
    }
  }

  // 2. 本地回退模式 (Data URL)
  if (onProgress) onProgress(50);
  const dataUrl = await fileToDataUrl(file);
  if (onProgress) onProgress(100);

  return {
    url: dataUrl,
    storagePath: `local/${storagePath}`,
  };
}

export async function deleteCloudImage(_storagePath?: string): Promise<void> {
  // 刪除邏輯
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(URL.createObjectURL(file));
    reader.readAsDataURL(file);
  });
}
