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
  ShieldCheck,
  Edit3,
  Eye,
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
  isViewOnly?: boolean;
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
  isViewOnly = false,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedMode, setCopiedMode] = useState<'collab' | 'view' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateBook(newTitle.trim());
    setNewTitle('');
    setIsCreating(false);
  };

  const getShareUrl = (mode: 'collab' | 'view' = 'collab') => {
    if (!currentBook) return window.location.href;
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('book', currentBook.id);
    if (mode === 'view') {
      url.searchParams.set('mode', 'view');
    }
    return url.toString();
  };

  const copyShareLink = (mode: 'collab' | 'view') => {
    navigator.clipboard.writeText(getShareUrl(mode));
    setCopiedMode(mode);
    setTimeout(() => setCopiedMode(null), 2000);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* 左側：品牌與冊子選擇器 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-100 flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-800 text-base sm:text-lg leading-tight flex items-center gap-1.5">
                雲端成績翻閱冊
              </h1>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                isFirebaseConfigured 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {isFirebaseConfigured ? (
                  <>
                    <Cloud className="w-3 h-3 text-emerald-500 animate-pulse" />
                    Firebase 雲端同步
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3 h-3 text-amber-500" />
                    本地暫存模式
                  </>
                )}
              </span>
            </div>

            {/* 冊子下拉選單 */}
            <div className="flex items-center gap-2 mt-0.5">
              <select
                aria-label="選擇測驗冊子"
                value={currentBook?.id || ''}
                onChange={(e) => {
                  if (e.target.value === '__NEW_BOOK__') {
                    setIsCreating(true);
                  } else {
                    onSelectBook(e.target.value);
                  }
                }}
                className="text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200 rounded-md px-2 py-0.5 outline-none transition-colors cursor-pointer max-w-[180px] sm:max-w-[260px] truncate"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    📖 {b.title} ({Object.keys(b.students || {}).length} 人)
                  </option>
                ))}
                <option value="__NEW_BOOK__">➕ 新增考試冊子...</option>
              </select>

              <button
                type="button"
                onClick={() => setIsCreating(true)}
                title="新增考試冊子"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">新冊子</span>
              </button>

              {currentBook && books.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`確定要刪除冊子「${currentBook.title}」及其所有學生圖片嗎？`)) {
                      onDeleteBook(currentBook.id);
                    }
                  }}
                  title="刪除當前冊子"
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 中間：學生搜尋框 */}
        <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋學生名字..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-transparent focus:border-indigo-400 rounded-lg outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

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
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg shadow-sm transition-all"
                title="下載此冊完整資料備份 (JSON)"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>備份</span>
              </button>

              {/* 回復備份按鈕 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg shadow-sm transition-all"
                title="從備份檔回復/匯入成績冊 (JSON)"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>回復</span>
              </button>

              {/* 分享此冊 */}
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50/80 border border-indigo-200 hover:bg-indigo-100 rounded-lg shadow-sm transition-all"
                title="取得分享連結 (可選唯讀或共同編輯)"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>分享</span>
              </button>
            </>
          )}

          {!isViewOnly && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-lg shadow-sm shadow-indigo-200 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>傳成績截圖</span>
            </button>
          )}
        </div>
      </div>

      {/* 手機版搜尋列 */}
      <div className="md:hidden px-4 pb-2">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋學生姓名..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-400 rounded-lg outline-none"
          />
        </div>
      </div>

      {/* 新增冊子對話框 */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              新增考試冊子
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              例如：「113第一次段考數學」、「九月模考自然」等，方便將整場考試集合在一起。
            </p>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                autoFocus
                placeholder="請輸入冊子名稱..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  建立冊子
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 分享彈窗 */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-600" />
                分享此冊成績圖
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              您可以依據對象選擇要複製「共同協作編輯」或「僅供看圖翻閱」的分享連結：
            </p>

            <div className="space-y-3 mb-5">
              {/* 模式 A：共同協作編輯 */}
              <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                    共同協作編輯連結 (可看圖、可上傳與更正)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyShareLink('collab')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                  >
                    {copiedMode === 'collab' ? <Check className="w-3 h-3" /> : null}
                    {copiedMode === 'collab' ? '已複製' : '複製協作連結'}
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={getShareUrl('collab')}
                  className="w-full bg-white border border-indigo-200 text-[11px] text-slate-600 rounded px-2 py-1 outline-none select-all"
                />
              </div>

              {/* 模式 B：僅供唯讀翻閱 */}
              <div className="border border-slate-200 bg-slate-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    純看圖翻閱連結 (隱藏上傳，僅供瀏覽考卷)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyShareLink('view')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    {copiedMode === 'view' ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                    {copiedMode === 'view' ? '已複製' : '複製唯讀連結'}
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={getShareUrl('view')}
                  className="w-full bg-white border border-slate-200 text-[11px] text-slate-600 rounded px-2 py-1 outline-none select-all"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
