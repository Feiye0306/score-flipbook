import type { ExamBook } from '../types';
import { saveExamBook } from './dbService';

/**
 * 匯出冊子為 JSON 備份檔
 */
export function exportBookBackup(book: ExamBook): void {
  const exportData = {
    version: '1.0',
    exportAt: new Date().toISOString(),
    book: {
      ...book,
      updatedAt: Date.now(),
    },
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const cleanTitle = (book.title || '未命名冊子').replace(/[\\/:*?"<>|]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `成績冊備份_${cleanTitle}_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 從備份 JSON 檔案回復/匯入冊子
 */
export async function importBookBackup(file: File): Promise<ExamBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        // 支援新版 (包含 exportData 包裹) 與舊版直接是 ExamBook
        const bookData: ExamBook = parsed.book ? parsed.book : parsed;

        if (!bookData.id || !bookData.title || typeof bookData.students !== 'object') {
          throw new Error('備份檔案格式不正確，缺少必要欄位！');
        }

        // 保存到資料庫
        await saveExamBook(bookData);
        resolve(bookData);
      } catch (err: any) {
        reject(new Error(err?.message || '解析備份檔失敗'));
      }
    };
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsText(file);
  });
}
