import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  collection,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { ExamBook, ScoreImage, StudentFolder } from '../types';

const COLLECTION_NAME = 'score_books';
const LOCAL_STORAGE_KEY = 'score_flipbook_local_data';
const MY_BOOK_IDS_KEY = 'score_flipbook_my_ids';

// 狀態：記錄 Firebase 是否報權限錯誤
export let isCloudPermissionDenied = false;

// 取得本機登記擁有的冊子 ID 清單
export function getRegisteredBookIds(): string[] {
  try {
    const raw = localStorage.getItem(MY_BOOK_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function registerBookId(bookId: string): void {
  try {
    const ids = new Set(getRegisteredBookIds());
    ids.add(bookId);
    localStorage.setItem(MY_BOOK_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch (err) {
    console.warn('註冊冊子 ID 警訊：', err);
  }
}

export function unregisterBookId(bookId: string): void {
  try {
    const ids = new Set(getRegisteredBookIds());
    ids.delete(bookId);
    localStorage.setItem(MY_BOOK_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch (err) {
    console.warn('移除冊子 ID 警訊：', err);
  }
}

// 本地快取輔助
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
 * 精準讀取單一冊子 (抗順藤摸瓜：不遍歷全庫，僅單點讀取)
 */
export async function fetchSingleBook(bookId: string): Promise<ExamBook | null> {
  // 1. 先查本地
  const localMap = getLocalBooks();
  const localBook = localMap[bookId];

  // 2. 查雲端單一文檔
  if (isFirebaseConfigured && db) {
    try {
      const firestoreDb = db;
      const docRef = doc(firestoreDb, COLLECTION_NAME, bookId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const cloudBook = snapshot.data() as ExamBook;
        // 同步存入本地
        localMap[bookId] = cloudBook;
        saveLocalBooks(localMap);
        registerBookId(bookId);
        return cloudBook;
      }
    } catch (err: any) {
      console.warn('單點讀取雲端文檔失敗：', err.message);
    }
  }

  return localBook || null;
}

/**
 * 監聽指定冊子清單 (精確抗爬蟲模式：對每個已註冊 ID 獨立監聽，絕不請求全集合 list)
 */
export function subscribeBooks(
  onUpdate: (books: ExamBook[]) => void,
  onPermissionWarning?: () => void
): () => void {
  const emitLocal = () => {
    const local = Object.values(getLocalBooks()).sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
    );
    onUpdate(local);
  };
  emitLocal();

  // 若未啟用 Firebase，直接返回
  if (!isFirebaseConfigured || !db) {
    return () => {};
  }

  const firestoreDb = db;
  const localMap = getLocalBooks();
  // 註冊本機現有所有冊子 ID
  Object.keys(localMap).forEach((id) => registerBookId(id));
  const bookIds = getRegisteredBookIds();

  const unsubscribes: Array<() => void> = [];

  // 針對使用者擁有的每一本冊子發起精確監聽（完全不需要 list 權限，徹底防順藤摸瓜）
  bookIds.forEach((bookId) => {
    try {
      const docRef = doc(firestoreDb, COLLECTION_NAME, bookId);
      const unsub = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            isCloudPermissionDenied = false;
            const updated = snap.data() as ExamBook;
            const currentLocal = getLocalBooks();
            currentLocal[updated.id] = updated;
            saveLocalBooks(currentLocal);

            const sorted = Object.values(currentLocal).sort(
              (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
            );
            onUpdate(sorted);
          }
        },
        (err) => {
          console.warn(`精準監聽冊子 [${bookId}] 受阻：`, err.message);
          isCloudPermissionDenied = true;
          if (onPermissionWarning) onPermissionWarning();
        }
      );
      unsubscribes.push(unsub);
    } catch (err) {
      console.warn('監聽例外：', err);
    }
  });

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}

/**
 * 監聽單一冊子 (訪客專屬模式：只監聽被授權的那一本)
 */
export function subscribeSingleBook(
  bookId: string,
  onUpdate: (book: ExamBook) => void
): () => void {
  registerBookId(bookId);

  // 立即讀取本地快取
  const localMap = getLocalBooks();
  if (localMap[bookId]) {
    onUpdate(localMap[bookId]);
  }

  if (isFirebaseConfigured && db) {
    try {
      const firestoreDb = db;
      const docRef = doc(firestoreDb, COLLECTION_NAME, bookId);
      const membersColRef = collection(firestoreDb, COLLECTION_NAME, bookId, 'members');

      const unsubDoc = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as ExamBook;
            const current = getLocalBooks();
            const merged: ExamBook = {
              ...data,
              students: {
                ...(current[bookId]?.students || {}),
                ...(data.students || {}),
              },
            };
            current[bookId] = merged;
            saveLocalBooks(current);
            onUpdate(merged);
          }
        },
        (err) => {
          console.warn(`訪客單冊監聽受阻 [${bookId}]：`, err.message);
        }
      );

      // 即時同步監聽成員圖片子集合 (突破 1MB 限制，多人同時上傳秒級合併)
      const unsubMembers = onSnapshot(
        membersColRef,
        (colSnap) => {
          const current = getLocalBooks();
          const book = current[bookId] || {
            id: bookId,
            title: '圖文手冊',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            students: {},
          };

          const studentsMap = { ...(book.students || {}) };
          colSnap.forEach((mSnap) => {
            if (mSnap.exists()) {
              const folder = mSnap.data() as StudentFolder;
              studentsMap[folder.studentName] = folder;
            }
          });

          book.students = studentsMap;
          book.updatedAt = Date.now();
          current[bookId] = book;
          saveLocalBooks(current);
          onUpdate(book);
        },
        (err) => {
          console.warn(`成員子集合監聽受阻 [${bookId}]：`, err.message);
        }
      );

      return () => {
        unsubDoc();
        unsubMembers();
      };
    } catch (err) {
      console.warn('單冊監聽例外：', err);
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

  // 1. 本地立即儲存
  registerBookId(book.id);
  const local = getLocalBooks();
  local[book.id] = updatedBook;
  saveLocalBooks(local);

  // 2. 異步同步至 Firebase
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, book.id);
      await setDoc(docRef, updatedBook, { merge: true });
      isCloudPermissionDenied = false;
    } catch (err: any) {
      console.warn('⚠️ 雲端同步受阻 (儲存於本機暫存中)：', err.message);
      isCloudPermissionDenied = true;
    }
  }
}

/**
 * 刪除冊子
 */
export async function deleteExamBook(bookId: string): Promise<void> {
  // 1. 本地立即刪除
  unregisterBookId(bookId);
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
  const cleanName = studentName.trim() || '未分類成員';
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

  // 3. 同步寫入 Firestore 獨立成員子文檔 (徹底免除單文件 1MB 限制，百張考卷極速同步)
  if (isFirebaseConfigured && db) {
    try {
      const firestoreDb = db;
      const memberDocRef = doc(firestoreDb, COLLECTION_NAME, bookId, 'members', cleanName);
      await setDoc(memberDocRef, existingFolder, { merge: true });
    } catch (err: any) {
      console.warn('子集合成員同步警訊：', err.message);
    }
  }
}

/**
 * 刪除成員的單張截圖
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

    // 同步更新雲端子集合
    if (isFirebaseConfigured && db) {
      try {
        const firestoreDb = db;
        const memberDocRef = doc(firestoreDb, COLLECTION_NAME, bookId, 'members', cleanName);
        await setDoc(memberDocRef, book.students[cleanName], { merge: true });
      } catch (err: any) {
        console.warn('雲端成員圖片刪除同步警訊：', err.message);
      }
    }
  }
}

/**
 * 刪除整個成員與其所有圖片
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

    // 同步從雲端子集合刪除該成員
    if (isFirebaseConfigured && db) {
      try {
        const firestoreDb = db;
        const memberDocRef = doc(firestoreDb, COLLECTION_NAME, bookId, 'members', cleanName);
        await deleteDoc(memberDocRef);
      } catch (err: any) {
        console.warn('雲端成員刪除同步警訊：', err.message);
      }
    }
  }
}
