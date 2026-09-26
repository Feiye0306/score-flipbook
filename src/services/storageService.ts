import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../config/firebase';

export interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * 將圖片上傳到 Firebase Storage
 * 若未設定 Firebase 或上傳失敗，降級為本地 Object URL / DataURL
 */
export async function uploadImageToCloud(
  bookId: string,
  studentName: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ url: string; storagePath: string }> {
  // 如果 Firebase Storage 可用
  if (isFirebaseConfigured && storage) {
    const timestamp = Date.now();
    const cleanStudentName = studentName.trim() || '未分類學生';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\u4e00-\u9fa5_-]/g, '_');
    const storagePath = `score_flipbooks/${bookId}/${cleanStudentName}/${timestamp}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(Math.round(progress));
        },
        (error) => {
          console.error('Firebase Storage 上傳失敗，嘗試本地降級：', error);
          // 若權限或網路錯誤，回退到 Data URL
          fileToDataUrl(file).then((dataUrl) => {
            resolve({
              url: dataUrl,
              storagePath: `local/${storagePath}`,
            });
          }).catch(reject);
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
            reject(err);
          }
        }
      );
    });
  }

  // 本地快取模式
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
  if (!storagePath || storagePath.startsWith('local/') || !storage || !isFirebaseConfigured) {
    return;
  }
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn('雲端檔案刪除或不存在：', err);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
