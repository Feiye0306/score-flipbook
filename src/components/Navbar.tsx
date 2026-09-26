import React, { useState, useRef } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  UploadCloud, 
  Share2, 
  Cloud, 
  HardDrive,
  Trash2,
  Check,
  Download,
  Upload,
  AlertTriangle,
  X
} from 'lucide-react';
import type { ExamBook } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { exportBookBackup, importBookBackup } from '../services/backupService';
import { isCloudPermissionDenied } from '../services/dbService';

interface NavbarProps {
  books: ExamBook[];
  currentBook: ExamBook | null;
  onSelectBook: (bookId: string) => void;
  onCreateBook: (title: string) => void;
  onDeleteBook: (bookId: string) => void;
  onBookRestored?: (book: ExamBook) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenUpload: () => void;
  onOpenShare?: () => void;
  onOpenCloudGuide?: () => void;
  activeTab?: 'shelf' | 'book';
  onTabChange?: (tab: 'shelf' | 'book') => void;
  isViewOnly?: boolean;
  isSingleBookMode?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  books,
  currentBook,
  onSelectBook,
  onCreateBook,
  onDeleteBook,
  onBookRestored,
  searchQuery,
  onSearchChange,
  onOpenUpload,
  onOpenShare,
  onOpenCloudGuide,
  activeTab = 'shelf',
  onTabChange,
  isViewOnly = false,
  isSingleBookMode = false,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateBook(newTitle.trim());
    setNewTitle('');
    setIsCreating(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#EDE7DC]/90 backdrop-blur-md border-b border-[#DDD5C7] shadow-2xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* 左側：品牌標誌與標籤 */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div 
            onClick={() => onTabChange?.('shelf')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#16202A] flex items-center justify-center text-white shadow-2xs flex-shrink-0 cursor-pointer hover:bg-[#233140] transition-colors"
            title="回到圖冊陳列相冊"
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 
                onClick={() => onTabChange?.('shelf')}
                className="font-extrabold text-[#16202A] text-sm sm:text-base leading-tight flex items-center gap-1 font-serif cursor-pointer hover:text-stone-600 transition-colors truncate"
              >
                雲端圖文翻閱冊
              </h1>

              {/* 雲端同步狀態標籤 */}
              <button
                type="button"
                onClick={onOpenCloudGuide}
                className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 cursor-pointer transition-all hover:shadow-xs active:scale-95 ${
                  isCloudPermissionDenied
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                    : isFirebaseConfigured
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-stone-100 text-stone-700 border border-stone-200'
                }`}
                title={
                  isCloudPermissionDenied
                    ? "目前資料暫存於此電腦瀏覽器。點擊查看如何開通雲端以供手機跨裝置同步分享。"
                    : "雲端同步狀態"
                }
              >
                {isCloudPermissionDenied ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                    <span>本機暫存 (點擊設定雲端)</span>
                  </>
                ) : isFirebaseConfigured ? (
                  <>
                    <Cloud className="w-3 h-3 text-emerald-600 animate-pulse" />
                    <span className="hidden sm:inline">雲端同步中</span>
                    <span className="sm:hidden">雲端</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3 h-3 text-stone-500" />
                    <span>本地模式</span>
                  </>
                )}
              </button>
            </div>

            {/* 書架 vs 當前冊子 導航標籤（未進入冊子時不顯示冊名） */}
            {!isSingleBookMode && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {activeTab === 'shelf' ? (
                  <span className="text-[10px] sm:text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                    📚 圖冊書架 (共 {books.length} 冊)
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onTabChange?.('shelf')}
                      className="text-[10px] sm:text-[11px] font-bold text-stone-500 hover:text-stone-900 px-1 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      ← 返回書架
                    </button>
                    <span className="text-stone-300 text-[10px]">/</span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded truncate max-w-[120px] sm:max-w-[200px]">
                      {currentBook?.title || '當前圖冊'}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 中間：搜尋框 (僅在單冊名單且桌面版顯示) */}
        {activeTab === 'book' && (
          <div className="hidden lg:flex items-center flex-1 max-w-xs mx-3">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜尋學生名字..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-stone-100 focus:bg-white border border-transparent focus:border-amber-400 rounded-lg outline-none text-stone-800"
              />
            </div>
          </div>
        )}

        {/* 右側：動作按鈕群 (手機極致精簡防折行) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* 隱藏的還原備份檔案選擇器 */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const restored = await importBookBackup(file);
                  alert(`✅ 成功還原冊子「${restored.title}」，共包含 ${Object.keys(restored.students || {}).length} 位學生！`);
                  if (onBookRestored) onBookRestored(restored);
                } catch (err: any) {
                  alert('❌ 還原失敗：' + (err.message || '檔案格式錯誤'));
                }
                e.target.value = '';
              }
            }}
          />

          {currentBook && (
            <>
              {/* 桌機版備份按鈕 */}
              <button
                type="button"
                onClick={() => exportBookBackup(currentBook)}
                className="hidden md:inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-[#16202A] bg-white border border-[#D6E1EA] hover:border-[#16202A] rounded-full shadow-2xs transition-all cursor-pointer"
                title="下載此冊完整資料備份 (JSON)"
              >
                <Download className="w-3.5 h-3.5 text-stone-600" />
                <span>備份</span>
              </button>

              {/* 桌機版回復按鈕 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="hidden md:inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-[#16202A] bg-white border border-[#D6E1EA] hover:border-[#16202A] rounded-full shadow-2xs transition-all cursor-pointer"
                title="從備份檔回復/匯入成績冊 (JSON)"
              >
                <Upload className="w-3.5 h-3.5 text-stone-600" />
                <span>回復</span>
              </button>

              {/* 分享本冊 */}
              <button
                type="button"
                onClick={() => onOpenShare?.()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#16202A] bg-white hover:bg-stone-50 border border-[#D6E1EA] hover:border-[#16202A] rounded-full shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                title="取得分享連結 (可選協作上傳或唯讀翻閱)"
              >
                <Share2 className="w-3.5 h-3.5 text-stone-600" />
                <span>分享</span>
              </button>
            </>
          )}

          {!isViewOnly && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#8A5638] hover:bg-[#73452B] active:scale-95 rounded-full shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <UploadCloud className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">上傳截圖</span>
              <span className="sm:hidden">上傳</span>
            </button>
          )}
        </div>
      </div>

      {/* 新增冊子對話框 */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1 flex items-center gap-2 font-serif">
              <BookOpen className="w-5 h-5 text-[#8A5638]" />
              新增考試冊子
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              例如：「113第一次段考數學」、「九月模考自然」等。
            </p>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                autoFocus
                placeholder="請輸入冊子名稱..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#8A5638] focus:border-[#8A5638] outline-none mb-4 text-stone-800"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#8A5638] hover:bg-[#73452B] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  建立冊子
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
