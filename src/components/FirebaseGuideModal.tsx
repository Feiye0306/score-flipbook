import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldAlert, 
  Download, 
  Smartphone,
  Sparkles
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
  const [copiedRule, setCopiedRule] = useState(false);

  if (!isOpen) return null;

  const ruleCode = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

  const copyRule = () => {
    navigator.clipboard.writeText(ruleCode);
    setCopiedRule(true);
    setTimeout(() => setCopiedRule(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 relative border border-stone-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0">
            <Cloud className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif">
              雲端同步狀態與跨裝置設定
            </h3>
            <p className="text-xs text-stone-500">
              為什麼手機點開分享連結會是空白？
            </p>
          </div>
        </div>

        <div className="text-xs text-stone-600 space-y-4 mb-6 leading-relaxed">
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
            <h4 className="font-bold text-amber-950 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              原因說明：Firebase 雲端規則尚未開放
            </h4>
            <p className="text-stone-600 text-[11px] leading-normal">
              目前您上傳的考卷已安全保存在<b>這台電腦的瀏覽器中</b>。但因為 Firebase 專案（<code className="text-amber-900 font-mono">gen-lang-client-0123519296</code>）預設阻擋未登入讀寫，因此手機或其他人的設備連線時會被拒絕，導致顯示 0 人。
            </p>
          </div>

          {/* 解法 A：30秒開通 Firebase 規則 (永久解決) */}
          <div className="space-y-2">
            <h4 className="font-bold text-stone-900 flex items-center gap-1 text-xs">
              <Sparkles className="w-4 h-4 text-amber-600" />
              方法一：30 秒發布 Firebase 讀寫規則（推薦）
            </h4>
            <p className="text-[11px] text-stone-500">
              只需點開下方連結，貼上規則並點擊「發布」，即可開通所有手機與電腦隨處看圖：
            </p>

            <div className="bg-stone-900 text-stone-200 p-3 rounded-xl relative font-mono text-[11px]">
              <pre className="overflow-x-auto">{ruleCode}</pre>
              <button
                type="button"
                onClick={copyRule}
                className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 text-[10px] font-sans font-bold cursor-pointer"
              >
                {copiedRule ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRule ? '已複製！' : '複製規則代碼'}</span>
              </button>
            </div>

            <a
              href="https://console.firebase.google.com/project/gen-lang-client-0123519296/firestore/rules"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <span>前往 Firebase Console 貼上規則</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* 解法 B：免雲端直接發送檔案 */}
          {currentBook && (
            <div className="border-t border-stone-200 pt-3 space-y-1.5">
              <h4 className="font-bold text-stone-900 flex items-center gap-1 text-xs">
                <Smartphone className="w-4 h-4 text-stone-600" />
                方法二：免雲端！直接匯出檔案給手機看
              </h4>
              <p className="text-[11px] text-stone-500">
                點擊下方下載此冊備份檔（JSON），用 Line 傳給手機，手機點網頁上的「回復」即可秒載入全班考卷：
              </p>
              <button
                type="button"
                onClick={() => exportBookBackup(currentBook)}
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-stone-600" />
                <span>下載「{currentBook.title}」備份檔 (可直傳手機)</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
