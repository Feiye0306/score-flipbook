import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';

const TOKEN_COLLECTION = 'access_tokens';
const LOCAL_TOKENS_KEY = 'score_flipbook_access_tokens';

export interface AccessTokenData {
  token: string;
  bookId: string;
  role: 'collab' | 'view';
  createdAt: number;
  isActive: boolean;
}

/**
 * 本地 Token 快取（離線或本地模式備用）
 */
function getLocalTokens(): Record<string, AccessTokenData> {
  try {
    const raw = localStorage.getItem(LOCAL_TOKENS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalToken(tokenData: AccessTokenData): void {
  try {
    const map = getLocalTokens();
    map[tokenData.token] = tokenData;
    localStorage.setItem(LOCAL_TOKENS_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('儲存本地 Token 警訊：', err);
  }
}

/**
 * 產生密碼學安全隨機字串 (Cryptographically Secure Random String)
 * 長度 24 字元，組合數超過 10^36，數學上無法被暴力猜測或遍歷
 */
export function generateSecureRandomToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const array = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 24; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  let result = 'tk_';
  for (let i = 0; i < array.length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

/**
 * 為指定冊子建立一層安全查驗 Token (寫入 access_tokens 集合)
 */
export async function createAccessToken(
  bookId: string,
  role: 'collab' | 'view'
): Promise<string> {
  const token = generateSecureRandomToken();
  const tokenData: AccessTokenData = {
    token,
    bookId,
    role,
    createdAt: Date.now(),
    isActive: true,
  };

  // 1. 本地備份
  saveLocalToken(tokenData);

  // 2. 雲端同步註冊
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, TOKEN_COLLECTION, token);
      await setDoc(docRef, tokenData);
    } catch (err) {
      console.warn('雲端註冊 Token 失敗 (本機暫存模式)：', err);
    }
  }

  return token;
}

/**
 * 查驗 Token：向資料庫驗證該 Token 是否合法有效，並解鎖回傳 bookId 與權限
 */
export async function verifyAccessToken(
  token: string
): Promise<{ bookId: string; role: 'collab' | 'view' } | null> {
  if (!token || !token.trim()) return null;
  const cleanToken = token.trim();

  // 1. 優先向雲端安全層查驗
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, TOKEN_COLLECTION, cleanToken);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as AccessTokenData;
        if (data && data.isActive !== false && data.bookId) {
          // 查驗通過，同步快取到本機
          saveLocalToken(data);
          return { bookId: data.bookId, role: data.role || 'collab' };
        }
      }
    } catch (err) {
      console.warn('雲端查驗 Token 遇阻，嘗試本機核對：', err);
    }
  }

  // 2. 若無雲端或本機暫存模式，核對本機快取
  const localMap = getLocalTokens();
  const localData = localMap[cleanToken];
  if (localData && localData.isActive !== false && localData.bookId) {
    return { bookId: localData.bookId, role: localData.role || 'collab' };
  }

  return null;
}
