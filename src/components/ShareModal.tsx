import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Users, 
  Eye, 
  Check, 
  Sparkles,
  Link
} from 'lucide-react';
import type { ExamBook } from '../types';

interface ShareModalProps {
  currentBook: ExamBook;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  currentBook,
  isOpen,
  onClose,
}) => {
  const [copiedType, setCopiedType] = useState<'collab' | 'view' | null>(null);

  if (!isOpen) return null;

  const code = currentBook.shareCode || currentBook.id;

  // 1. 協作上傳連結 (他人可看圖 + 可上傳編輯)
  const collabUrl = new URL(window.location.origin + window.location.pathname);
  collabUrl.searchParams.set('share', code);

  // 2. 唯讀翻閱連結 (他人僅能看圖，不可上傳)
  const viewOnlyUrl = new URL(window.location.origin + window.location.pathname);
  viewOnlyUrl.searchParams.set('share', code);
  viewOnlyUrl.searchParams.set('mode', 'view');

  const handleCopy = (type: 'collab' | 'view', url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 relative border border-slate-100">
        {/* 關閉按鈕 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 標題 */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-800">
              分享冊子「{currentBook.title}」
            </h3>
            <p className="text-xs text-slate-500">
              專屬代碼：<span className="font-mono font-bold text-indigo-600">{code}</span>
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-5">
          每本冊子都有各自專屬的隨機連結，點開此連結的人<b>只能看到並操作這本冊子</b>，看不到您其他考試！
        </p>

        {/* 兩種模式卡片 */}
        <div className="space-y-4 mb-6">
          {/* 模式 A：共同協作上傳 (最顯眼推薦) */}
          <div className="bg-gradient-to-br from-indigo-50/90 to-indigo-100/40 border-2 border-indigo-400/80 rounded-2xl p-4 relative shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-950">
                <Users className="w-4 h-4 text-indigo-600" />
                【協作上傳】分享連結（推薦）
              </span>
              <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                可看圖＋可上傳編輯
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              對方點開後，可以直接看整冊所有考卷，且<b>能點擊「傳成績截圖」共同上傳照片、輸入學生姓名</b>。
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={collabUrl.toString()}
                className="bg-white border border-indigo-200 text-xs text-slate-700 px-3 py-2 rounded-xl flex-1 outline-none select-all font-mono"
              />
              <button
                type="button"
                onClick={() => handleCopy('collab', collabUrl.toString())}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-200 transition-all flex-shrink-0 cursor-pointer"
              >
                {copiedType === 'collab' ? <Check className="w-4 h-4 text-emerald-300" /> : <Link className="w-4 h-4" />}
                <span>{copiedType === 'collab' ? '已複製！' : '複製協作連結'}</span>
              </button>
            </div>
          </div>

          {/* 模式 B：僅供唯讀翻閱 */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Eye className="w-4 h-4 text-slate-500" />
                【唯讀看圖】分享連結
              </span>
              <span className="bg-slate-200 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                只供瀏覽
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              對方點開只能翻頁看圖、放大細節，<b>無法上傳、修改或刪除考卷</b>（適合給家長）。
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={viewOnlyUrl.toString()}
                className="bg-white border border-slate-200 text-xs text-slate-600 px-3 py-2 rounded-xl flex-1 outline-none select-all font-mono"
              />
              <button
                type="button"
                onClick={() => handleCopy('view', viewOnlyUrl.toString())}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 rounded-xl transition-all flex-shrink-0 cursor-pointer"
              >
                {copiedType === 'view' ? <Check className="w-4 h-4 text-emerald-600" /> : <Link className="w-4 h-4" />}
                <span>{copiedType === 'view' ? '已複製！' : '複製唯讀連結'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
