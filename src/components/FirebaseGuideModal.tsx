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
  const [ruleTab, setRuleTab] = useState<'sync' | 'private'>('sync');
  const [copiedFirestore, setCopiedFirestore] = useState(false);
  const [copiedStorage, setCopiedStorage] = useState(false);

  if (!isOpen) return null;

  // 1. 方案 A：多裝置即時同步規則 (推薦自用 / 手機電腦全自動互通)
  const firestoreSyncRule = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 允許 score_books 與其所有成員子集合讀寫 (支援手機、電腦跨設備秒級即時同步)
    match /score_books/{document=**} {
      allow read, write: if true;
    }
    match /access_tokens/{document=**} {
      allow read, write: if true;
    }
  }
}`;

  // 2. 方案 B：嚴格隱私防爬蟲模式 (禁止全庫掃描，手機必須點擊特定分享連結才可開啟)
  const firestorePrivateRule = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 🚫 禁止全庫掃描列表
    match /score_books {
      allow list: if false;
    }
    // 僅憑已知精準 ID 單點讀寫
    match /score_books/{bookId} {
      allow get, write: if true;
      allow list: if false;
    }
    match /score_books/{bookId}/members/{memberId} {
      allow read, write: if true;
    }
    match /access_tokens/{token} {
      allow get, write: if true;
      allow list: if false;
    }
  }
}`;

  const currentRule = ruleTab === 'sync' ? firestoreSyncRule : firestorePrivateRule;

  // 3. Storage 圖片存儲安全規則
  const storageRule = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /flipbooks/{allPaths=**} {
      allow read, write: if true;
    }
  }
}`;

  const copyFirestore = () => {
    navigator.clipboard.writeText(currentRule);
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
              雲端開通與跨裝置同步說明
            </h3>
            <p className="text-xs text-stone-500">
              專案 ID：<span className="font-mono text-amber-900 font-bold">my-tools-hub-1fdb1</span>
            </p>
          </div>
        </div>

        <div className="text-xs text-stone-600 space-y-4 my-2 overflow-y-auto pr-1 leading-relaxed">
          {/* 安全架構背書 */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5">
            <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              手機與跨裝置同步模式選擇
            </h4>
            <p className="text-stone-600 text-[11px] leading-normal">
              請根據您的使用習慣選擇規則。推薦使用<b>「方案 A：全自動即時同步」</b>，電腦建立的新冊或上傳的考卷，手機打開首頁即可隨時管理翻閱！
            </p>
          </div>

          {/* 步驟 1：Firestore 規則 */}
          <div className="space-y-2 border border-stone-200 rounded-2xl p-4 bg-stone-50/50">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                步驟 1：發布 Firestore 資料庫規則
              </h4>
              <a
                href="https://console.firebase.google.com/project/my-tools-hub-1fdb1/firestore/rules"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
              >
                <span>前往後台設定</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* 方案切換 Tabs */}
            <div className="flex items-center gap-1 bg-stone-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setRuleTab('sync')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  ruleTab === 'sync'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                📱 方案 A：手機電腦全同步（推薦）
              </button>
              <button
                type="button"
                onClick={() => setRuleTab('private')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  ruleTab === 'private'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                🔒 方案 B：純分享連結才可見
              </button>
            </div>

            <div className="bg-stone-900 text-stone-200 p-3 rounded-xl relative font-mono text-[10.5px]">
              <pre className="overflow-x-auto max-h-36">{currentRule}</pre>
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
                href="https://console.firebase.google.com/project/my-tools-hub-1fdb1/storage/rules"
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
