import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { ExamBook, ScoreImage, StudentFolder } from '../types';

const COLLECTION_NAME = 'score_books';
const LOCAL_STORAGE_KEY = 'score_flipbook_local_data';

// 本地存儲 Fallback 輔助
function getLocalBooks(): Record<string, ExamBook> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalBooks(books: Record<string, ExamBook>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(books));
  } catch (err) {
    console.warn('LocalStorage 儲存失敗或已滿：', err);
  }
}

/**
 * 監聽所有冊子清單
 */
export function subscribeBooks(
  onUpdate: (books: ExamBook[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, COLLECTION_NAME));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const books: ExamBook[] = [];
        snapshot.forEach((docSnap) => {
          books.push(docSnap.data() as ExamBook);
        });
        // 依照更新時間倒序排列
        books.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        onUpdate(books);
      },
      (err) => {
        console.error('Firestore 訂閱冊子失敗，切換為本地數據：', err);
        const local = Object.values(getLocalBooks()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        onUpdate(local);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  }

  // 本地模式
  const local = Object.values(getLocalBooks()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  onUpdate(local);
  return () => {};
}

/**
 * 監聽單一冊子詳細資料 (即時同步翻閱)
 */
export function subscribeBookDetail(
  bookId: string,
  onUpdate: (book: ExamBook | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, COLLECTION_NAME, bookId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as ExamBook);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.error('Firestore 訂閱單冊失敗：', err);
        const local = getLocalBooks();
        onUpdate(local[bookId] || null);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  }

  // 本地模式
  const local = getLocalBooks();
  onUpdate(local[bookId] || null);
  return () => {};
}

/**
 * 建立或儲存冊子
 */
export async function saveExamBook(book: ExamBook): Promise<void> {
  const updatedBook = {
    ...book,
    updatedAt: Date.now(),
  };

  // 本地備份
  const local = getLocalBooks();
  local[book.id] = updatedBook;
  saveLocalBooks(local);

  if (isFirebaseConfigured && db) {
    const docRef = doc(db, COLLECTION_NAME, book.id);
    await setDoc(docRef, updatedBook, { merge: true });
  }
}

/**
 * 刪除冊子
 */
export async function deleteExamBook(bookId: string): Promise<void> {
  const local = getLocalBooks();
  delete local[bookId];
  saveLocalBooks(local);

  if (isFirebaseConfigured && db) {
    const docRef = doc(db, COLLECTION_NAME, bookId);
    await deleteDoc(docRef);
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

  // 取得現有資料
  let book: ExamBook | null = null;
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, COLLECTION_NAME, bookId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      book = snap.data() as ExamBook;
    }
  }

  if (!book) {
    const local = getLocalBooks();
    book = local[bookId] || {
      id: bookId,
      title: '未命名冊子',
      createdAt: now,
      updatedAt: now,
      students: {},
    };
  }

  if (!book.students) {
    book.students = {};
  }

  const existingFolder: StudentFolder = book.students[cleanName] || {
    id: cleanName,
    studentName: cleanName,
    images: [],
    updatedAt: now,
  };

  // 合併圖片並設定頁面排序
  const currentImages = [...existingFolder.images];
  newImages.forEach((img, idx) => {
    img.order = img.order || currentImages.length + idx + 1;
    currentImages.push(img);
  });

  // 依 order 排序
  currentImages.sort((a, b) => (a.order || 0) - (b.order || 0));

  existingFolder.images = currentImages;
  existingFolder.updatedAt = now;
  book.students[cleanName] = existingFolder;
  book.updatedAt = now;

  // 儲存回資料庫
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
