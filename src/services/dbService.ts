import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import type { ExamBook, ScoreImage, StudentFolder } from '../types';

const COLLECTION_NAME = 'score_books';
const LOCAL_STORAGE_KEY = 'score_flipbook_local_data';
const MY_BOOK_IDS_KEY = 'score_flipbook_my_ids';
const DELETED_BOOKS_KEY = 'score_flipbook_deleted_books';

// 狀態：記錄 Firebase 是否報權限錯誤
export let isCloudPermissionDenied = false;

// 墓碑管理：記錄已被刪除的冊子 ID，防止跨裝置自動同步時殭屍復活
export function getDeletedBookIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_BOOKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markBookAsDeleted(bookId: string): void {
  try {
    const ids = new Set(getDeletedBookIds());
    ids.add(bookId);
    localStorage.setItem(DELETED_BOOKS_KEY, JSON.stringify(Array.from(ids)));
  } catch (err) {
    console.warn('記錄墓碑冊子 ID 警訊：', err);
  }
}

export function isBookMarkedDeleted(bookId: string): boolean {
  const ids = new Set(getDeletedBookIds());
  return ids.has(bookId);
}

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
    // 若重新註冊或建立，從墓碑清單移除
    const deletedIds = new Set(getDeletedBookIds());
    if (deletedIds.has(bookId)) {
      deletedIds.delete(bookId);
      localStorage.setItem(DELETED_BOOKS_KEY, JSON.stringify(Array.from(deletedIds)));
    }

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
 * 精準讀取單一冊子 (支援 members 子集合圖片合併載入)
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

        // 同步載入 members 子集合，確保圖片不遺漏
        try {
          const membersCol = collection(firestoreDb, COLLECTION_NAME, bookId, 'members');
          const membersSnap = await getDocs(membersCol);
          const studentsMap: Record<string, StudentFolder> = { ...(cloudBook.students || {}) };
          membersSnap.forEach((mDoc) => {
            if (mDoc.exists()) {
              const folder = mDoc.data() as StudentFolder;
              studentsMap[folder.studentName] = folder;
            }
          });
          cloudBook.students = studentsMap;
        } catch (mErr) {
          console.warn('載入 members 子集合警訊：', mErr);
        }

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
 * 依據 shareCode 或 bookId 跨裝置查找單冊 (手機打開分享連結秒級加載)
 */
export async function fetchBookByShareCodeOrId(shareOrId: string): Promise<ExamBook | null> {
  const cleanKey = shareOrId.trim();
  if (!cleanKey) return null;

  // 1. 先查本地快取
  const localMap = getLocalBooks();
  if (localMap[cleanKey]) return localMap[cleanKey];
  const matchedLocal = Object.values(localMap).find(
    (b) => b.shareCode === cleanKey || b.id === cleanKey
  );
  if (matchedLocal) return matchedLocal;

  // 2. 查雲端：先直接以 docId 查詢
  const byId = await fetchSingleBook(cleanKey);
  if (byId) return byId;

  // 3. 查雲端：若不是 docId，以 shareCode 查詢
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, COLLECTION_NAME), where('shareCode', '==', cleanKey));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const foundDoc = qSnap.docs[0];
        return await fetchSingleBook(foundDoc.id);
      }
    } catch (err: any) {
      console.warn('透過 shareCode 查詢雲端冊子失敗：', err.message);
    }
  }

  return null;
}

/**
 * 監聽冊子清單 (雲端優先全域同步 + 本地秒開 + 降級防護)
 * 手機直接打開首頁即可自動拉取電腦建立的所有書冊！
 */
export function subscribeBooks(
  onUpdate: (books: ExamBook[]) => void,
  onPermissionWarning?: () => void
): () => void {
  // 1. 立即以本地快取資料開屏，秒開不等待
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

  // 背景自動偵測並補推本機尚未同步至雲端的冊子 (例如 2026高三一模成績單)
  setTimeout(() => {
    syncLocalBooksToCloud();
  }, 200);

  const firestoreDb = db;
  const memberUnsubscribes: Record<string, () => void> = {};

  // 輔助函式：即時監聽成員圖片子集合
  const attachMembersListener = (bookId: string) => {
    if (memberUnsubscribes[bookId]) return;
    try {
      const membersCol = collection(firestoreDb, COLLECTION_NAME, bookId, 'members');
      const unsub = onSnapshot(
        membersCol,
        (colSnap) => {
          const current = getLocalBooks();
          if (!current[bookId]) return;

          // 嚴格以雲端子集合現存成員為準，雲端刪除某成員時，本地同步移除！
          const studentsMap: Record<string, StudentFolder> = {};
          colSnap.forEach((mSnap) => {
            if (mSnap.exists()) {
              const folder = mSnap.data() as StudentFolder;
              studentsMap[folder.studentName] = folder;
            }
          });

          current[bookId].students = studentsMap;
          saveLocalBooks(current);
          const sorted = Object.values(current).sort(
            (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
          );
          onUpdate(sorted);
        },
        () => {}
      );
      memberUnsubscribes[bookId] = unsub;
    } catch {
      // 靜默處理
    }
  };

  // 降級方案：逐一精準監聽本地已知的冊子
  const fallbackUnsubs: Array<() => void> = [];
  const startFallback = () => {
    const localMap = getLocalBooks();
    Object.keys(localMap).forEach((id) => registerBookId(id));
    const bookIds = getRegisteredBookIds();

    bookIds.forEach((bookId) => {
      try {
        const docRef = doc(firestoreDb, COLLECTION_NAME, bookId);
        const unsub = onSnapshot(
          docRef,
          (snap) => {
            if (snap.exists()) {
              isCloudPermissionDenied = false;
              const updated = snap.data() as ExamBook;
              if (isBookMarkedDeleted(updated.id)) return;

              const currentLocal = getLocalBooks();
              currentLocal[updated.id] = {
                ...(currentLocal[updated.id] || {}),
                ...updated,
                students: {
                  ...(updated.students || {}),
                  ...(currentLocal[updated.id]?.students || {}),
                },
              };
              saveLocalBooks(currentLocal);
              attachMembersListener(updated.id);

              const sorted = Object.values(currentLocal).sort(
                (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
              );
              onUpdate(sorted);
            } else {
              // 雲端該文檔已不存在，本地同步刪除
              const currentLocal = getLocalBooks();
              if (currentLocal[bookId]) {
                delete currentLocal[bookId];
                unregisterBookId(bookId);
                saveLocalBooks(currentLocal);
                const sorted = Object.values(currentLocal).sort(
                  (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
                );
                onUpdate(sorted);
              }
            }
          },
          (err) => {
            console.warn(`精準監聽冊子 [${bookId}] 受阻：`, err.message);
            isCloudPermissionDenied = true;
            if (onPermissionWarning) onPermissionWarning();
          }
        );
        fallbackUnsubs.push(unsub);
        attachMembersListener(bookId);
      } catch (err) {
        console.warn('監聽例外：', err);
      }
    });
  };

  // 首選方案：全集合即時監聽（手機與電腦跨裝置秒級自動同步）
  let unsubCollection: (() => void) | null = null;
  try {
    const colRef = collection(firestoreDb, COLLECTION_NAME);
    unsubCollection = onSnapshot(
      colRef,
      (snap) => {
        isCloudPermissionDenied = false;
        const currentLocal = getLocalBooks();
        const cloudIds = new Set<string>();

        snap.forEach((docSnap) => {
          if (docSnap.exists()) {
            const cloudBook = docSnap.data() as ExamBook;
            cloudIds.add(cloudBook.id);

            // 若本機已手動標記為刪除，跳過不寫入
            if (isBookMarkedDeleted(cloudBook.id)) {
              delete currentLocal[cloudBook.id];
              return;
            }

            registerBookId(cloudBook.id);
            currentLocal[cloudBook.id] = {
              ...(currentLocal[cloudBook.id] || {}),
              ...cloudBook,
              students: {
                ...(cloudBook.students || {}),
                ...(currentLocal[cloudBook.id]?.students || {}),
              },
            };
            attachMembersListener(cloudBook.id);
          }
        });

        // 關鍵同步規則：雲端集合中已經不存在的冊子，本地必須鏡像刪除！
        Object.keys(currentLocal).forEach((localId) => {
          if (!cloudIds.has(localId)) {
            // 剛在本地建立未滿 5 秒且未被刪除者給予同步緩衝，其餘一律同步清除
            const isJustCreated = Date.now() - (currentLocal[localId]?.createdAt || 0) < 5000;
            if (!isJustCreated || isBookMarkedDeleted(localId)) {
              delete currentLocal[localId];
              unregisterBookId(localId);
            }
          }
        });

        saveLocalBooks(currentLocal);
        const sorted = Object.values(currentLocal).sort(
          (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
        );
        onUpdate(sorted);
      },
      (err) => {
        console.warn('全集合即時監聽受阻，切換為精準監聽：', err.message);
        isCloudPermissionDenied = true;
        if (onPermissionWarning) onPermissionWarning();
        startFallback();
      }
    );
  } catch (err) {
    console.warn('全集合監聽初始化例外，切換至降級模式：', err);
    startFallback();
  }

  return () => {
    if (unsubCollection) unsubCollection();
    fallbackUnsubs.forEach((u) => u());
    Object.values(memberUnsubscribes).forEach((u) => u());
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

  // 2. 異步同步至 Firebase (只存輕量中繼資料，圖片獨立於 members 子集合，免除 1MB 上限！)
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, book.id);
      const cleanBookMeta = {
        id: updatedBook.id,
        title: updatedBook.title,
        shareCode: updatedBook.shareCode || updatedBook.id,
        createdAt: updatedBook.createdAt,
        updatedAt: updatedBook.updatedAt,
      };
      await setDoc(docRef, cleanBookMeta, { merge: true });
      isCloudPermissionDenied = false;
    } catch (err: any) {
      console.warn('⚠️ 雲端同步受阻 (儲存於本機暫存中)：', err.message);
      isCloudPermissionDenied = true;
    }
  }
}

/**
 * 刪除冊子 (徹底清除雲端父文檔、所有成員子集合、本機快取與註冊，並登記墓碑防死灰復燃)
 */
export async function deleteExamBook(bookId: string): Promise<void> {
  // 1. 本地立即刪除並寫入墓碑標記，杜絕任何裝置再度復活
  markBookAsDeleted(bookId);
  unregisterBookId(bookId);
  const local = getLocalBooks();
  delete local[bookId];
  saveLocalBooks(local);

  // 2. 徹底同步刪除雲端：清空 members 子集合所有成員與圖片，再刪除父文檔
  if (isFirebaseConfigured && db) {
    try {
      const firestoreDb = db;
      const membersCol = collection(firestoreDb, COLLECTION_NAME, bookId, 'members');
      const membersSnap = await getDocs(membersCol);
      const deletePromises = membersSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      const docRef = doc(firestoreDb, COLLECTION_NAME, bookId);
      await deleteDoc(docRef);
    } catch (err: any) {
      console.warn('雲端徹底刪除失敗：', err.message);
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

/**
 * 自動將本地所有冊子補同步至雲端 (針對先前因 1MB 限制或離線累積的本地冊子)
 * 一旦電腦打開頁面，立即將電腦本機的「高三一模」等冊子自動上傳至雲端！
 */
export async function syncLocalBooksToCloud(): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const localMap = getLocalBooks();
  const bookList = Object.values(localMap);
  if (bookList.length === 0) return;

  const firestoreDb = db;
  for (const book of bookList) {
    if (!book.id || !book.title) continue;
    // 若已被記錄為刪除，跳過且從本地清除
    if (isBookMarkedDeleted(book.id)) {
      delete localMap[book.id];
      saveLocalBooks(localMap);
      continue;
    }

    try {
      const docRef = doc(firestoreDb, COLLECTION_NAME, book.id);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        // 雲端文檔不存在：若建立時間超過 15 秒，視為在其他裝置被刪除，清理本地快取，絕不盲目補推！
        const isFresh = Date.now() - (book.createdAt || 0) < 15000;
        if (!isFresh) {
          delete localMap[book.id];
          unregisterBookId(book.id);
          saveLocalBooks(localMap);
          continue;
        }
      }

      // 若雲端父文檔更新時間較舊，進行補同步
      if (!snap.exists() || (snap.data()?.updatedAt || 0) < (book.updatedAt || 0)) {
        console.info(`[AutoSync] 正在將新冊子「${book.title}」同步至雲端...`);
        // 1. 寫入乾淨父文檔 metadata (免除 1MB 限制)
        await setDoc(docRef, {
          id: book.id,
          title: book.title,
          shareCode: book.shareCode || book.id,
          createdAt: book.createdAt || Date.now(),
          updatedAt: book.updatedAt || Date.now(),
        }, { merge: true });

        // 2. 逐一同步成員子文檔
        if (book.students) {
          for (const [studentName, folder] of Object.entries(book.students)) {
            const memberDocRef = doc(firestoreDb, COLLECTION_NAME, book.id, 'members', studentName);
            await setDoc(memberDocRef, folder, { merge: true });
          }
        }
        console.info(`[AutoSync] 冊子「${book.title}」已成功同步至雲端！`);
      }
    } catch (err) {
      console.warn(`[AutoSync] 同步「${book.title}」警訊：`, err);
    }
  }
}

export interface ForceSyncResult {
  syncedBooks: string[];
  totalMembers: number;
  error?: string;
}

/**
 * 強制全量同步本機所有有效冊子與圖片至雲端 (排除已被刪除的冊子)
 */
export async function forceSyncAllToCloud(
  onProgress?: (message: string) => void
): Promise<ForceSyncResult> {
  if (!isFirebaseConfigured || !db) {
    return { syncedBooks: [], totalMembers: 0, error: '未連接至雲端服務' };
  }

  const localMap = getLocalBooks();
  const bookList = Object.values(localMap);
  const syncedBooks: string[] = [];
  let totalMembers = 0;

  if (bookList.length === 0) {
    return { syncedBooks, totalMembers };
  }

  const firestoreDb = db;
  for (const book of bookList) {
    if (!book.id || !book.title) continue;
    // 墓碑過濾：已被刪除的冊子絕對不能推上雲端！
    if (isBookMarkedDeleted(book.id)) continue;

    onProgress?.(`正在將「${book.title}」中繼資料推上雲端...`);

    try {
      const docRef = doc(firestoreDb, COLLECTION_NAME, book.id);
      // 1. 強制寫入父文檔 metadata (永遠小於 1KB，絕不超標)
      await setDoc(docRef, {
        id: book.id,
        title: book.title,
        shareCode: book.shareCode || book.id,
        createdAt: book.createdAt || Date.now(),
        updatedAt: book.updatedAt || Date.now(),
      }, { merge: true });

      // 2. 逐一寫入各成員考卷圖片
      if (book.students) {
        const studentEntries = Object.entries(book.students);
        for (let i = 0; i < studentEntries.length; i++) {
          const [studentName, folder] = studentEntries[i];
          onProgress?.(`正在同步「${book.title}」成員 (${i + 1}/${studentEntries.length})：${studentName}...`);
          const memberDocRef = doc(firestoreDb, COLLECTION_NAME, book.id, 'members', studentName);
          await setDoc(memberDocRef, folder, { merge: true });
          totalMembers++;
        }
      }

      syncedBooks.push(book.title);
    } catch (err: any) {
      console.error(`強制同步「${book.title}」失敗：`, err);
    }
  }

  return { syncedBooks, totalMembers };
}

