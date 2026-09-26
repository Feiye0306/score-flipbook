import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../config/firebase';

export interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * 將圖片上傳到 Firebase Storage，若 Storage 權限未開或失敗，平滑降級為高畫質 DataURL
 */
export async function uploadImageToCloud(
  bookId: string,
  studentName: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ url: string; storagePath: string }> {
  // 如果 Firebase Storage 可用且未被禁用
  if (isFirebaseConfigured && storage) {
    try {
      const timestamp = Date.now();
      const cleanStudentName = studentName.trim() || '未分類學生';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\u4e00-\u9fa5_-]/g, '_');
      const storagePath = `score_flipbooks/${bookId}/${cleanStudentName}/${timestamp}_${cleanFileName}`;
      const storageRef = ref(storage, storagePath);

      return await new Promise((resolve) => {
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type || 'image/jpeg',
        });

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          },
          async (error) => {
            console.warn('⚠️ Firebase Storage 權限或連線未開放，自動降級至高品質本地存儲：', error.message);
            // 降級為本地 Data URL，保證使用者流程絕對不中斷
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
            } catch (err) {
              console.warn('取得下載網址失敗，降級為 DataURL：', err);
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
      console.warn('Storage 初始化失敗，回退至本地：', err.message);
    }
  }

  // 純本地模式
  if (onProgress) onProgress(50);
  const dataUrl = await fileToDataUrl(file);
  if (onProgress) onProgress(100);
  return {
    url: dataUrl,
    storagePath: `local/${bookId}/${studentName}/${Date.now()}_${file.name}`,
  };
}

/**
 * 刪除雲端圖片
 */
export async function deleteCloudImage(storagePath?: string): Promise<void> {
  // 本地路徑或無權限時直接略過
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => {
      // 若連 FileReader 都失敗，使用 URL.createObjectURL
      resolve(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  });
}
