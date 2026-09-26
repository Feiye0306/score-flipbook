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
  Layers,
  X
} from 'lucide-react';
import type { ExamBook } from '../types';
import { isFirebaseConfigured } from '../config/firebase';
import { exportBookBackup, importBookBackup } from '../services/backupService';

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
    <header className="sticky top-0 z-30 bg-[#FDFCF7]/95 backdrop-blur-md border-b border-stone-200/90 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* 左側：品牌標誌與書架/冊子切換 */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => onTabChange?.('shelf')}
            className="w-10 h-10 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400 shadow-sm flex-shrink-0 cursor-pointer hover:bg-stone-800 transition-colors"
            title="回到成績冊陳列書架"
          >
            <BookOpen className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 
                onClick={() => onTabChange?.('shelf')}
                className="font-bold text-stone-900 text-base sm:text-lg leading-tight flex items-center gap-1.5 font-serif cursor-pointer hover:text-amber-800 transition-colors"
              >
                雲端成績翻閱冊
              </h1>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                isFirebaseConfigured 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {isFirebaseConfigured ? (
                  <>
                    <Cloud className="w-3 h-3 text-emerald-600 animate-pulse" />
                    雲端同步
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3 h-3 text-amber-600" />
                    本地暫存
                  </>
                )}
              </span>
            </div>

            {/* 視圖切換標籤：書架 vs 當前冊子 */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {!isSingleBookMode && (
                <div className="flex items-center bg-stone-100/90 p-0.5 rounded-lg border border-stone-200/80">
                  <button
                    type="button"
                    onClick={() => onTabChange?.('shelf')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      activeTab === 'shelf'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    📚 冊子書架 ({books.length})
                  </button>
                  {currentBook && (
                    <button
                      type="button"
                      onClick={() => onTabChange?.('book')}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer truncate max-w-[140px] sm:max-w-[180px] ${
                        activeTab === 'book'
                          ? 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      📖 {currentBook.title}
                    </button>
                  )}
                </div>
              )}

              {isSingleBookMode && currentBook && (
                <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md truncate max-w-[200px] sm:max-w-[320px]">
                  📖 {currentBook.title} (專屬協作模式)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 中間：搜尋框 (當在單冊名單時可用) */}
        {activeTab === 'book' && (
          <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜尋學生名字..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-100 hover:bg-stone-200/60 focus:bg-white border border-transparent focus:border-amber-400 rounded-lg outline-none transition-all text-stone-800 placeholder-stone-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 右側：動作按鈕群 */}
        <div className="flex items-center gap-2">
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
              {/* 匯出備份按鈕 */}
              <button
                type="button"
                onClick={() => exportBookBackup(currentBook)}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg shadow-sm transition-all"
                title="下載此冊完整資料備份 (JSON)"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span>備份</span>
              </button>

              {/* 回復備份按鈕 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg shadow-sm transition-all"
                title="從備份檔回復/匯入成績冊 (JSON)"
              >
                <Upload className="w-3.5 h-3.5 text-stone-500" />
                <span>回復</span>
              </button>

              {/* 分享此冊 (協作/唯讀) */}
              <button
                type="button"
                onClick={() => onOpenShare?.()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg shadow-sm transition-all cursor-pointer"
                title="取得分享連結 (可選協作上傳或唯讀翻閱)"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-700" />
                <span>分享本冊</span>
              </button>
            </>
          )}

          {!isViewOnly && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 active:scale-95 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-amber-400" />
              <span>傳成績截圖</span>
            </button>
          )}
        </div>
      </div>

      {/* 手機版搜尋列 */}
      {activeTab === 'book' && (
        <div className="md:hidden px-4 pb-2">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋學生姓名..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-stone-100 focus:bg-white border border-transparent focus:border-amber-400 rounded-lg outline-none text-stone-800 placeholder-stone-400"
            />
          </div>
        </div>
      )}

      {/* 新增冊子對話框 */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150 border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1 flex items-center gap-2 font-serif">
              <BookOpen className="w-5 h-5 text-amber-700" />
              新增考試冊子
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              例如：「113第一次段考數學」、「九月模考自然」等，方便將整場考試集合在一起。
            </p>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                autoFocus
                placeholder="請輸入冊子名稱..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none mb-4 text-stone-800"
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
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
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
