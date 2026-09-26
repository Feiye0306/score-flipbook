import JSZip from 'jszip';
import type { ExamBook, ScoreImage } from '../types';

/**
 * 將 URL (Data URL 或遠端 URL) 轉換為 Blob
 */
async function urlToBlob(url: string): Promise<Blob> {
  if (url.startsWith('data:')) {
    const arr = url.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  const response = await fetch(url);
  return await response.blob();
}

/**
 * 觸發瀏覽器下載 Blob 檔案
 */
function triggerDownload(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 分人打包下載：下載指定成員的所有圖片
 */
export async function downloadPersonImages(
  personName: string,
  images: ScoreImage[],
  onProgress?: (progressText: string) => void
): Promise<void> {
  if (!images || images.length === 0) {
    alert(`成員「${personName}」沒有可下載的圖片`);
    return;
  }

  if (onProgress) onProgress(`正在準備 ${personName} 的圖片...`);

  // 若只有單張圖片，直接單張下載更輕巧
  if (images.length === 1) {
    const blob = await urlToBlob(images[0].url);
    const ext = images[0].name?.split('.').pop() || 'jpg';
    triggerDownload(blob, `${personName}_第1頁.${ext}`);
    if (onProgress) onProgress('下載完成！');
    return;
  }

  // 多張圖片：打包成 ZIP
  const zip = new JSZip();
  const folder = zip.folder(personName) || zip;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (onProgress) onProgress(`打包中 (${i + 1}/${images.length})...`);
    try {
      const blob = await urlToBlob(img.url);
      const ext = img.name?.split('.').pop() || 'jpg';
      folder.file(`${personName}_第${i + 1}頁.${ext}`, blob);
    } catch (err) {
      console.warn(`下載圖片失敗 [${img.name}]:`, err);
    }
  }

  if (onProgress) onProgress('正在壓縮檔案...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zipBlob, `${personName}_圖片包.zip`);
  if (onProgress) onProgress('下載完成！');
}

/**
 * 整冊全部打包下載：將所有成員分類打包成一個大 ZIP
 */
export async function downloadBookImages(
  book: ExamBook,
  onProgress?: (progressText: string) => void
): Promise<void> {
  const studentKeys = Object.keys(book.students || {});
  if (studentKeys.length === 0) {
    alert(`冊子「${book.title}」尚無圖片可供打包下載`);
    return;
  }

  const zip = new JSZip();
  let totalImages = 0;
  let processedImages = 0;

  // 計算總圖片數
  for (const sName of studentKeys) {
    totalImages += (book.students[sName]?.images || []).length;
  }

  if (totalImages === 0) {
    alert(`冊子「${book.title}」尚無圖片可供打包下載`);
    return;
  }

  for (const sName of studentKeys) {
    const folderData = book.students[sName];
    const sImages = folderData?.images || [];
    if (sImages.length === 0) continue;

    // 建立每個成員的子資料夾
    const studentZipFolder = zip.folder(sName) || zip;

    for (let i = 0; i < sImages.length; i++) {
      processedImages++;
      if (onProgress) {
        onProgress(`正在打包 (${processedImages}/${totalImages})：${sName}...`);
      }
      try {
        const img = sImages[i];
        const blob = await urlToBlob(img.url);
        const ext = img.name?.split('.').pop() || 'jpg';
        studentZipFolder.file(`${sName}_第${i + 1}頁.${ext}`, blob);
      } catch (err) {
        console.warn(`下載圖片失敗 [${sName} - ${i}]:`, err);
      }
    }
  }

  if (onProgress) onProgress('正在產生壓縮檔，請稍候...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const safeTitle = (book.title || '翻閱相冊').replace(/[/\\?%*:|"<>]/g, '_');
  triggerDownload(zipBlob, `${safeTitle}_全部打包.zip`);
  if (onProgress) onProgress('下載完成！');
}
