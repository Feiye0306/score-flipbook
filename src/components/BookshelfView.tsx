import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Users,
  ArrowRight,
  Share2,
  Trash2,
  Download,
  Calendar,
  X,
  FileDown,
  ExternalLink,
  Image,
  ChevronRight,
} from 'lucide-react';
import type { ExamBook } from '../types';
import { downloadBookImages, downloadPersonImages } from '../utils/zipExporter';

// ─────────────────────────────────────────────────────────────
// 主題系統：現代扁平配色（亮色調，易識別）
// ─────────────────────────────────────────────────────────────
export interface BookTheme {
  id: string;
  label: string;
  accent: string;        // 主色 (hex)
  accentLight: string;   // 淡化背景色 Tailwind class
  accentText: string;    // 主色文字 Tailwind class
  accentBorder: string;  // 主色邊框 Tailwind class
  accentBtn: string;     // 主色按鈕 Tailwind class
  dot: string;           // 圓點色
}

export const BOOK_THEMES: BookTheme[] = [
  {
    id: 'blue',
    label: '藍調',
    accent: '#2563EB',
    accentLight: 'bg-blue-50',
    accentText: 'text-blue-600',
    accentBorder: 'border-blue-200',
    accentBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
    dot: 'bg-blue-500',
  },
  {
    id: 'violet',
    label: '紫韻',
    accent: '#7C3AED',
    accentLight: 'bg-violet-50',
    accentText: 'text-violet-600',
    accentBorder: 'border-violet-200',
    accentBtn: 'bg-violet-600 hover:bg-violet-700 text-white',
    dot: 'bg-violet-500',
  },
  {
    id: 'emerald',
    label: '翠綠',
    accent: '#059669',
    accentLight: 'bg-emerald-50',
    accentText: 'text-emerald-600',
    accentBorder: 'border-emerald-200',
    accentBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    dot: 'bg-emerald-500',
  },
  {
    id: 'rose',
    label: '玫瑰',
    accent: '#E11D48',
    accentLight: 'bg-rose-50',
    accentText: 'text-rose-600',
    accentBorder: 'border-rose-200',
    accentBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
    dot: 'bg-rose-500',
  },
  {
    id: 'orange',
    label: '橙光',
    accent: '#EA580C',
    accentLight: 'bg-orange-50',
    accentText: 'text-orange-600',
    accentBorder: 'border-orange-200',
    accentBtn: 'bg-orange-600 hover:bg-orange-700 text-white',
    dot: 'bg-orange-500',
  },
  {
    id: 'cyan',
    label: '天青',
    accent: '#0891B2',
    accentLight: 'bg-cyan-50',
    accentText: 'text-cyan-600',
    accentBorder: 'border-cyan-200',
    accentBtn: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    dot: 'bg-cyan-500',
  },
  {
    id: 'amber',
    label: '琥珀',
    accent: '#D97706',
    accentLight: 'bg-amber-50',
    accentText: 'text-amber-600',
    accentBorder: 'border-amber-200',
    accentBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
    dot: 'bg-amber-500',
  },
  {
    id: 'pink',
    label: '粉彩',
    accent: '#DB2777',
    accentLight: 'bg-pink-50',
    accentText: 'text-pink-600',
    accentBorder: 'border-pink-200',
    accentBtn: 'bg-pink-600 hover:bg-pink-700 text-white',
    dot: 'bg-pink-500',
  },
];

export function getBookTheme(bookId: string, title: string): BookTheme {
  const str = bookId + title;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return BOOK_THEMES[Math.abs(hash) % BOOK_THEMES.length];
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface BookshelfViewProps {
  books: ExamBook[];
  currentBookId: string;
  onSelectBook: (bookId: string) => void;
  onOpenViewerForBook: (book: ExamBook, studentName?: string) => void;
  onOpenShareModal: (book: ExamBook) => void;
  onCreateBookClick: () => void;
  onDeleteBook: (bookId: string) => void;
  isViewOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────
// 格式化時間
// ─────────────────────────────────────────────────────────────
function formatUpdateTime(timestamp?: number): string {
  if (!timestamp) return '近期修訂';
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────
// 主組件
// ─────────────────────────────────────────────────────────────
export const BookshelfView: React.FC<BookshelfViewProps> = ({
  books,
  currentBookId,
  onSelectBook,
  onOpenViewerForBook,
  onOpenShareModal,
  onCreateBookClick,
  onDeleteBook,
  isViewOnly = false,
}) => {
  const [quickListBook, setQuickListBook] = useState<ExamBook | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* ── 頂部 Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            我的圖文冊
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            共 {books.length} 本 · 點擊封面即可翻閱
          </p>
        </div>

        {!isViewOnly && (
          <button
            type="button"
            onClick={onCreateBookClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            建立新圖冊
          </button>
        )}
      </div>

      {/* ── 空狀態 ── */}
      {books.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">尚無任何圖文冊</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
            建立第一本圖文冊，開始上傳並體驗流暢的翻頁閱讀！
          </p>
          {!isViewOnly && (
            <button
              type="button"
              onClick={onCreateBookClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-700 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              立即建立
            </button>
          )}
        </div>
      ) : (
        // ── 書架網格 ──
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {books.map((book) => {
            const studentKeys = Object.keys(book.students || {}).sort((a, b) =>
              a.localeCompare(b, 'zh-Hant')
            );
            const studentCount = studentKeys.length;
            let totalPages = 0;
            let sampleThumbnail: string | null = null;

            for (const sKey of studentKeys) {
              const folder = book.students[sKey];
              if (folder?.images?.length) {
                totalPages += folder.images.length;
                if (!sampleThumbnail) sampleThumbnail = folder.images[0].url;
              }
            }

            const isCurrent = book.id === currentBookId;
            const theme = getBookTheme(book.id, book.title);

            return (
              <div
                key={book.id}
                className={`group relative bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden hover:-translate-y-0.5 hover:shadow-lg ${
                  isCurrent
                    ? 'border-gray-900 shadow-md ring-2 ring-gray-900/10'
                    : 'border-gray-200 shadow-sm hover:border-gray-300'
                }`}
              >
                {/* 頂部彩色條 */}
                <div
                  className="h-1.5 w-full flex-shrink-0"
                  style={{ backgroundColor: theme.accent }}
                />

                {/* 縮圖 + 標題區塊（可點擊翻閱） */}
                <div
                  onClick={() => onOpenViewerForBook(book)}
                  className="flex gap-4 items-start p-4 sm:p-5 cursor-pointer select-none"
                >
                  {/* 縮圖 */}
                  <div className={`flex-shrink-0 w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden ${theme.accentLight} flex items-center justify-center border ${theme.accentBorder}`}>
                    {sampleThumbnail ? (
                      <img
                        src={sampleThumbnail}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className={`w-7 h-7 ${theme.accentText} opacity-60`} />
                    )}
                  </div>

                  {/* 標題資訊 */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    {/* 主題標籤 */}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${theme.accentText} mb-1.5`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                      {theme.label}
                    </span>

                    {/* 書名 */}
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-gray-700 transition-colors mb-2">
                      {book.title}
                    </h3>

                    {/* 統計 */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {studentCount} 位
                      </span>
                      <span className="flex items-center gap-1">
                        <Image className="w-3.5 h-3.5" />
                        {totalPages} 張圖
                      </span>
                    </div>
                  </div>
                </div>

                {/* 修訂時間 */}
                <div className="px-4 sm:px-5 pb-3 flex items-center gap-1.5 text-xs text-gray-400">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>修訂於 {formatUpdateTime(book.updatedAt || book.createdAt)}</span>
                </div>

                {/* 分隔線 */}
                <div className="mx-4 sm:mx-5 border-t border-gray-100" />

                {/* 操作按鈕區 */}
                <div className="p-3 sm:p-4 flex flex-col gap-2">
                  {/* 主要翻閱按鈕 */}
                  <button
                    type="button"
                    onClick={() => onOpenViewerForBook(book)}
                    disabled={studentCount === 0}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${theme.accentBtn}`}
                  >
                    <BookOpen className="w-4 h-4" />
                    開始翻閱
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* 次要按鈕列 */}
                  <div className="flex items-center gap-2">
                    {/* 名單確認 */}
                    <button
                      type="button"
                      onClick={() => setQuickListBook(book)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      名單 ({studentCount})
                    </button>

                    {/* 分享協作 */}
                    <button
                      type="button"
                      onClick={() => onOpenShareModal(book)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      分享
                    </button>

                    {/* 下載 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadBookImages(book, setDownloadProgress);
                      }}
                      disabled={totalPages === 0}
                      className="inline-flex items-center justify-center w-9 h-9 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                      title="打包下載全冊圖片"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* 刪除 */}
                    {books.length > 1 && !isViewOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`確定要刪除冊子「${book.title}」及其所有圖片嗎？`)) {
                            onDeleteBook(book.id);
                          }
                        }}
                        className="inline-flex items-center justify-center w-9 h-9 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="刪除此冊"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 建立新圖冊卡片 */}
          {!isViewOnly && (
            <div
              onClick={onCreateBookClick}
              className="group min-h-[200px] rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50 transition-all duration-200 flex flex-col items-center justify-center p-6 text-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 group-hover:border-gray-400 group-hover:scale-105 flex items-center justify-center text-gray-400 group-hover:text-gray-700 shadow-sm transition-all duration-200 mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-gray-700 group-hover:text-gray-900 text-sm mb-1">
                建立新圖文冊
              </h4>
              <p className="text-xs text-gray-400 max-w-[180px] leading-relaxed">
                測驗成果、活動記錄、設計截圖…
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 快速名單彈窗 ── */}
      {quickListBook && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh]">
            {/* 彈窗頂部 */}
            <div className="flex items-start justify-between p-5 pb-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 line-clamp-1">
                  {quickListBook.title}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  共 {Object.keys(quickListBook.students || {}).length} 位成員
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickListBook(null)}
                className="ml-3 flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 成員列表 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {Object.keys(quickListBook.students || {}).length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  此冊尚無任何成員資料
                </div>
              ) : (
                Object.keys(quickListBook.students || {})
                  .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
                  .map((personName, idx) => {
                    const folder = quickListBook.students[personName];
                    const imgCount = folder?.images?.length || 0;

                    return (
                      <div
                        key={personName}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                      >
                        <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            setQuickListBook(null);
                            onOpenViewerForBook(quickListBook, personName);
                          }}
                        >
                          <p className="font-medium text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                            {personName}
                          </p>
                          <p className="text-xs text-gray-400">{imgCount} 張圖片</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadPersonImages(personName, folder?.images || [], setDownloadProgress);
                            }}
                            disabled={imgCount === 0}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                            title={`下載 ${personName} 的圖片`}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickListBook(null);
                              onOpenViewerForBook(quickListBook, personName);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* 彈窗底部 */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => downloadBookImages(quickListBook, setDownloadProgress)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                打包下載全冊
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickListBook(null);
                  onSelectBook(quickListBook.id);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                詳細管理
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 下載進度 Toast ── */}
      {downloadProgress && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm animate-in slide-in-from-bottom duration-200">
          <FileDown className="w-4 h-4 text-blue-400 animate-pulse" />
          <span>{downloadProgress}</span>
        </div>
      )}
    </div>
  );
};
