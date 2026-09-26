import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { ExamBook, ScoreImage, StudentFolder } from '../types';

const COLLECTION_NAME = 'score_books';
const LOCAL_STORAGE_KEY = 'score_flipbook_local_data';

// 狀態：記錄 Firebase 是否報權限錯誤
export let isCloudPermissionDenied = false;

// 本地存儲輔助 (保證永遠可用)
export function getLocalBooks(): Record<string, ExamBook> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalBooks(books: Record<string, ExamBook>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(books));
  } catch (err) {
    console.warn('LocalStorage 儲存警訊：', err);
  }
}

/**
 * 監聽所有冊子清單 (本地優先 + 雲端同步)
 */
export function subscribeBooks(
  onUpdate: (books: ExamBook[]) => void,
  onPermissionWarning?: () => void
): () => void {
  // 先立即觸發一次本地資料，確保介面 0 秒即時渲染，絕不白屏或卡住
  const emitLocal = () => {
    const local = Object.values(getLocalBooks()).sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
    );
    onUpdate(local);
  };
  emitLocal();

  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, COLLECTION_NAME));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          isCloudPermissionDenied = false;
          const books: ExamBook[] = [];
          snapshot.forEach((docSnap) => {
            books.push(docSnap.data() as ExamBook);
          });

          // 與本地資料合併 (避免雲端剛清空時丟失)
          const localMap = getLocalBooks();
          books.forEach((b) => {
            localMap[b.id] = b;
          });
          saveLocalBooks(localMap);

          const finalBooks = Object.values(localMap).sort(
            (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
          );
          onUpdate(finalBooks);
        },
        (err) => {
          console.warn('⚠️ Firestore 讀取受限 (Permission Denied)，自動降級為本地優先模式：', err.message);
          isCloudPermissionDenied = true;
          if (onPermissionWarning) onPermissionWarning();
          emitLocal();
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('訂閱例外，回退到本地：', err);
      emitLocal();
      return () => {};
    }
  }

  return () => {};
}

/**
 * 建立或儲存冊子 (本地必定成功 + 異步嘗試同步雲端)
 */
export async function saveExamBook(book: ExamBook): Promise<void> {
  const updatedBook: ExamBook = {
    ...book,
    updatedAt: Date.now(),
  };

  // 1. 本地立即儲存 (確保 100% 成功，絕不卡死)
  const local = getLocalBooks();
  local[book.id] = updatedBook;
  saveLocalBooks(local);

  // 2. 異步同步至 Firebase (不阻塞使用者操作)
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, book.id);
      await setDoc(docRef, updatedBook, { merge: true });
    } catch (err: any) {
      console.warn('⚠️ 雲端同步失敗 (目前儲存於本機瀏覽器)：', err.message);
      isCloudPermissionDenied = true;
    }
  }
}

/**
 * 刪除冊子
 */
export async function deleteExamBook(bookId: string): Promise<void> {
  // 1. 本地立即刪除
  const local = getLocalBooks();
  delete local[bookId];
  saveLocalBooks(local);

  // 2. 異步同步至雲端
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, bookId);
      await deleteDoc(docRef);
    } catch (err: any) {
      console.warn('雲端刪除失敗：', err.message);
    }
  }
}

/**
 * 將圖片批次加入指定學生的檔案夾中
 */
export async function appendImagesToStudent(
  bookId: string,
  studentName: string,
  newImages: ScoreImage[]
): Promise<void> {
  const cleanName = studentName.trim() || '未分類學生';
  const now = Date.now();

  const local = getLocalBooks();
  const book = local[bookId] || {
    id: bookId,
    title: '未命名冊子',
    createdAt: now,
    updatedAt: now,
    students: {},
  };

  if (!book.students) {
    book.students = {};
  }

  const existingFolder: StudentFolder = book.students[cleanName] || {
    id: cleanName,
    studentName: cleanName,
    images: [],
    updatedAt: now,
  };

  const currentImages = [...existingFolder.images];
  newImages.forEach((img, idx) => {
    img.order = img.order || currentImages.length + idx + 1;
    currentImages.push(img);
  });

  currentImages.sort((a, b) => (a.order || 0) - (b.order || 0));

  existingFolder.images = currentImages;
  existingFolder.updatedAt = now;
  book.students[cleanName] = existingFolder;
  book.updatedAt = now;

  // 儲存更新 (本地立即生效 + 嘗試同步雲端)
  await saveExamBook(book);
}

/**
 * 刪除學生的單張截圖
 */
export async function removeStudentImage(
  bookId: string,
  studentName: string,
  imageId: string
): Promise<void> {
  const cleanName = studentName.trim();
  const local = getLocalBooks();
  const book = local[bookId];

  if (book && book.students && book.students[cleanName]) {
    book.students[cleanName].images = book.students[cleanName].images.filter(
      (img) => img.id !== imageId
    );
    book.students[cleanName].updatedAt = Date.now();
    book.updatedAt = Date.now();
    await saveExamBook(book);
  }
}

/**
 * 刪除整個學生與其所有圖片
 */
export async function removeStudentFolder(
  bookId: string,
  studentName: string
): Promise<void> {
  const cleanName = studentName.trim();
  const local = getLocalBooks();
  const book = local[bookId];

  if (book && book.students && book.students[cleanName]) {
    delete book.students[cleanName];
    book.updatedAt = Date.now();
    await saveExamBook(book);
  }
}
