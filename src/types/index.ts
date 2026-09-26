// 雲端成績翻閱冊資料型別定義

export interface ScoreImage {
  id: string;              // 圖片唯一 ID
  url: string;             // Firebase Storage 雲端下載 URL (或 Base64 預覽)
  storagePath?: string;    // Firebase Storage 路徑 (方便後續刪除)
  name: string;            // 檔名或標籤
  createdAt: number;       // 上傳時間戳
  order?: number;          // 排序索引 (第 1 頁, 第 2 頁...)
  width?: number;
  height?: number;
}

export interface StudentFolder {
  id: string;              // 學生 ID (通常為學生姓名或 uuid)
  studentName: string;     // 學生姓名
  images: ScoreImage[];    // 該學生的成績/考卷截圖列表 (1 ~ 多張)
  updatedAt: number;       // 最後更新時間
  notes?: string;          // 備註 (選填，如：滿分100、及格等)
}

export interface ExamBook {
  id: string;              // 冊子 ID (如 "2026-09-math-exam-1")
  title: string;           // 冊子名稱 (如 "113上高一第一次段考-數學")
  createdAt: number;       // 建立時間
  updatedAt: number;       // 更新時間
  description?: string;    // 說明
  students: Record<string, StudentFolder>; // 以學生姓名或 ID 為 key
  isPublic?: boolean;      // 是否開放瀏覽 (預設 true)
}

export interface UploadBatchItem {
  file: File;
  previewUrl: string;
  studentName: string;
  pageOrder: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMessage?: string;
}
