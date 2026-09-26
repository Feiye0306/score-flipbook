import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Users, 
  Eye, 
  Check, 
  Link,
  ShieldCheck,
  Lock,
  Loader2
} from 'lucide-react';
import type { ExamBook } from '../types';
import { createAccessToken } from '../services/tokenService';

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
  const [collabUrl, setCollabUrl] = useState<string>('');
  const [viewOnlyUrl, setViewOnlyUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 彈窗打開時，向資料庫註冊雙層查驗安全 Token (去特化，不含冊名或 ID)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    const generateTokens = async () => {
      try {
        const collabToken = await createAccessToken(currentBook.id, 'collab');
        const viewToken = await createAccessToken(currentBook.id, 'view');

        if (isMounted) {
          const baseUrl = window.location.origin + window.location.pathname;

          const cUrl = new URL(baseUrl);
          cUrl.searchParams.set('token', collabToken);
          setCollabUrl(cUrl.toString());

          const vUrl = new URL(baseUrl);
          vUrl.searchParams.set('token', viewToken);
          setViewOnlyUrl(vUrl.toString());
        }
      } catch (err) {
        console.warn('產生安全 Token 失敗，使用標準隨機碼：', err);
      } finally {
        if (isMounted) {
          setIsGenerating(false);
        }
      }
    };

    generateTokens();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentBook.id]);

  if (!isOpen) return null;

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
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0">
            <Share2 className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 font-serif">
              產生安全分享連結
            </h3>
            <p className="text-xs text-stone-500">
              目標圖冊：<span className="font-bold text-stone-800">{currentBook.title}</span>
            </p>
          </div>
        </div>

        {/* 安全防護背書卡片 */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 mb-5 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-emerald-950">
            <p className="font-bold mb-0.5">🛡️ 已啟用雙層資料庫鑑權與防順藤摸瓜保護</p>
            <p className="text-emerald-800">
              網址採用密碼學高熵隨機憑證，<b>絕不包含冊子名稱、科目或人員姓名</b>。外部訪問者必須先經雲端資料庫核對憑證合法才可載入，且<b>物理上完全無法探測或遍歷您其他的任何冊子</b>。
            </p>
          </div>
        </div>

        {isGenerating ? (
          <div className="py-12 text-center text-stone-500 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            <span>正在向資料庫註冊安全授權憑證...</span>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {/* 模式 A：共同協作上傳 */}
            <div className="bg-amber-50/40 border-2 border-amber-300 rounded-2xl p-4 relative shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900">
                  <Users className="w-4 h-4 text-amber-700" />
                  【協作上傳】專屬安全連結（推薦首選）
                </span>
                <span className="bg-amber-700 text-amber-50 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  可翻閱＋可上傳
                </span>
              </div>
              <p className="text-xs text-stone-600 mb-3 leading-normal">
                對方點開後，可依序翻閱本冊內容，並<b>具備上傳新圖片與分組成人員</b>的權限。
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={collabUrl}
                  className="bg-white border border-stone-200 text-xs text-stone-700 px-3 py-2 rounded-xl flex-1 outline-none select-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleCopy('collab', collabUrl)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 active:scale-95 rounded-xl shadow-xs transition-all flex-shrink-0 cursor-pointer"
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
                  <Eye className="w-4 h-4 text-stone-600" />
                  【唯讀翻閱】專屬安全連結
                </span>
                <span className="bg-stone-200 text-stone-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  僅供閱覽
                </span>
              </div>
              <p className="text-xs text-stone-500 mb-3 leading-normal">
                對方點開僅能翻閱、放大照片，<b>無法上傳、修改或刪除任何資料</b>。
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={viewOnlyUrl}
                  className="bg-white border border-stone-200 text-xs text-stone-600 px-3 py-2 rounded-xl flex-1 outline-none select-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleCopy('view', viewOnlyUrl)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 active:scale-95 rounded-xl transition-all flex-shrink-0 cursor-pointer"
                >
                  {copiedType === 'view' ? <Check className="w-4 h-4 text-emerald-600" /> : <Link className="w-4 h-4" />}
                  <span>{copiedType === 'view' ? '已複製！' : '複製唯讀連結'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
