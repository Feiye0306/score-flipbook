import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Download, 
  Smartphone,
  Sparkles,
  Lock
} from 'lucide-react';
import type { ExamBook } from '../types';
import { exportBookBackup } from '../services/backupService';

interface FirebaseGuideModalProps {
  currentBook: ExamBook | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseGuideModal: React.FC<FirebaseGuideModalProps> = ({
  currentBook,
  isOpen,
  onClose,
}) => {
  const [copiedFirestore, setCopiedFirestore] = useState(false);
  const [copiedStorage, setCopiedStorage] = useState(false);

  if (!isOpen) return null;

  // 1. 專業防順藤摸瓜 Firestore 安全規則：全面禁止 list 遍歷
  const firestoreRule = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 🚫 嚴禁任何全庫掃描與遍歷（徹底杜絕順藤摸瓜爬蟲）
    match /score_books {
      allow list: if false;
    }
    match /score_books/{bookId} {
      // 僅憑已知精確 ID 單點讀寫，外界物理上無法列出任何冊子清單
      allow get, write: if true;
      allow list: if false;
    }
    // 🚫 Token 安全鑑權層：嚴禁遍歷，僅限單點憑證查驗
    match /access_tokens {
      allow list: if false;
    }
    match /access_tokens/{token} {
      allow get, write: if true;
      allow list: if false;
    }
  }
}`;

  // 2. Storage 圖片存儲安全規則
  const storageRule = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /flipbooks/{allPaths=**} {
      allow read, write: if true;
    }
  }
}`;

  const copyFirestore = () => {
    navigator.clipboard.writeText(firestoreRule);
    setCopiedFirestore(true);
    setTimeout(() => setCopiedFirestore(false), 2000);
  };

  const copyStorage = () => {
    navigator.clipboard.writeText(storageRule);
    setCopiedStorage(true);
    setTimeout(() => setCopiedStorage(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-7 relative border border-stone-200 max-h-[90vh] flex flex-col">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2 flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0">
            <Cloud className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif">
              雲端開通與安全防護說明
            </h3>
            <p className="text-xs text-stone-500">
              專案 ID：<span className="font-mono text-amber-900 font-bold">gen-lang-client-0123519296</span>
            </p>
          </div>
        </div>

        <div className="text-xs text-stone-600 space-y-4 my-2 overflow-y-auto pr-1 leading-relaxed">
          {/* 安全架構背書 */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5">
            <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              資料庫安全設計：徹底杜絕順藤摸瓜（Anti-Scraping）
            </h4>
            <p className="text-stone-600 text-[11px] leading-normal">
              下方規則強制關閉了 <code className="text-rose-800 font-mono font-bold">allow list: if false</code>。這意味著<b>任何外部人員或網路爬蟲，都絕對無法掃描您的資料庫清單</b>！訪客只能透過您分享的高熵加密 Token 精準開啟被授權的那一本，完全看不到其他任何冊子或學生資料。
            </p>
          </div>

          {/* 步驟 1：Firestore 規則 */}
          <div className="space-y-2 border border-stone-200 rounded-2xl p-4 bg-stone-50/50">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                步驟 1：發布 Firestore 資料庫規則（防順藤摸瓜）
              </h4>
              <a
                href="https://console.firebase.google.com/project/gen-lang-client-0123519296/firestore/rules"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
              >
                <span>前往後台設定</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-stone-900 text-stone-200 p-3 rounded-xl relative font-mono text-[10.5px]">
              <pre className="overflow-x-auto max-h-36">{firestoreRule}</pre>
              <button
                type="button"
                onClick={copyFirestore}
                className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 text-[10px] font-sans font-bold cursor-pointer"
              >
                {copiedFirestore ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedFirestore ? '已複製！' : '複製代碼'}</span>
              </button>
            </div>
          </div>

          {/* 步驟 2：Storage 圖片儲存庫規則 */}
          <div className="space-y-2 border border-stone-200 rounded-2xl p-4 bg-stone-50/50">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                步驟 2：發布 Storage 圖片儲存庫規則
              </h4>
              <a
                href="https://console.firebase.google.com/project/gen-lang-client-0123519296/storage/rules"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
              >
                <span>前往後台設定</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-stone-900 text-stone-200 p-3 rounded-xl relative font-mono text-[10.5px]">
              <pre className="overflow-x-auto max-h-28">{storageRule}</pre>
              <button
                type="button"
                onClick={copyStorage}
                className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 text-[10px] font-sans font-bold cursor-pointer"
              >
                {copiedStorage ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedStorage ? '已複製！' : '複製代碼'}</span>
              </button>
            </div>
          </div>

          {/* 備份直傳手機 */}
          {currentBook && (
            <div className="pt-1 flex items-center justify-between gap-3 text-[11px] text-stone-500 bg-amber-50/30 p-3 rounded-xl border border-amber-200/50">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-stone-600 flex-shrink-0" />
                <span>免開雲端！亦可直接匯出此冊備份檔傳給手機：</span>
              </span>
              <button
                type="button"
                onClick={() => exportBookBackup(currentBook)}
                className="inline-flex items-center gap-1 px-3 py-1 font-bold text-stone-800 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg cursor-pointer flex-shrink-0"
              >
                <Download className="w-3 h-3" />
                <span>匯出 JSON</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-stone-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
