import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Users, 
  Eye, 
  Check, 
  Link,
  BookOpen
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 relative border border-stone-200">
        {/* 關閉按鈕 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 標題 */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0">
            <Share2 className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif">
              分享冊子「{currentBook.title}」
            </h3>
            <p className="text-xs text-stone-500 font-mono">
              專屬代碼：<span className="font-bold text-amber-800">#{code}</span>
            </p>
          </div>
        </div>

        <p className="text-xs text-stone-500 mb-5 leading-relaxed">
          每本冊子都有各自專屬的隨機連結，點開此連結的人<b>只能看到並操作這本冊子</b>，看不到您其他考試！
        </p>

        {/* 兩種模式卡片 */}
        <div className="space-y-4 mb-6">
          {/* 模式 A：共同協作上傳 (最顯眼推薦) */}
          <div className="bg-amber-50/40 border-2 border-amber-300 rounded-2xl p-4 relative shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900">
                <Users className="w-4 h-4 text-amber-700" />
                【協作上傳】分享連結（推薦首選）
              </span>
              <span className="bg-amber-700 text-amber-50 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                可看圖＋可上傳考卷
              </span>
            </div>
            <p className="text-xs text-stone-600 mb-3 leading-normal">
              對方點開後，可以直接翻閱整本冊子所有考卷，且<b>能點擊「傳成績截圖」共同上傳照片、輸入學生姓名</b>。
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={collabUrl.toString()}
                className="bg-white border border-stone-200 text-xs text-stone-700 px-3 py-2 rounded-xl flex-1 outline-none select-all font-mono"
              />
              <button
                type="button"
                onClick={() => handleCopy('collab', collabUrl.toString())}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 active:scale-95 rounded-xl shadow-sm transition-all flex-shrink-0 cursor-pointer"
              >
                {copiedType === 'collab' ? <Check className="w-4 h-4 text-amber-300" /> : <Link className="w-4 h-4" />}
                <span>{copiedType === 'collab' ? '已複製！' : '複製協作連結'}</span>
              </button>
            </div>
          </div>

          {/* 模式 B：僅供唯讀翻閱 */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700">
                <Eye className="w-4 h-4 text-stone-500" />
                【唯讀看圖】分享連結
              </span>
              <span className="bg-stone-200 text-stone-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                只供瀏覽
              </span>
            </div>
            <p className="text-xs text-stone-500 mb-3 leading-normal">
              對方點開只能翻頁看圖、放大細節，<b>無法上傳、修改或刪除考卷</b>（適合發給全班家長閱覽）。
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={viewOnlyUrl.toString()}
                className="bg-white border border-stone-200 text-xs text-stone-600 px-3 py-2 rounded-xl flex-1 outline-none select-all font-mono"
              />
              <button
                type="button"
                onClick={() => handleCopy('view', viewOnlyUrl.toString())}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 active:scale-95 rounded-xl transition-all flex-shrink-0 cursor-pointer"
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
            className="px-5 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
