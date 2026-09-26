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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight font-serif">
            我的圖文相冊
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 font-medium">
            共 {books.length} 本 · 點選封面即可直接進入全螢幕流暢翻閱
          </p>
        </div>

        {!isViewOnly && (
          <button
            type="button"
            onClick={onCreateBookClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#111111] hover:bg-[#262626] rounded-full shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>建立新圖冊</span>
          </button>
        )}
      </div>

      {/* ── 空狀態 ── */}
      {books.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white/70 backdrop-blur-xs rounded-3xl border border-[#E8E6E1] shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4 border border-stone-200">
            <BookOpen className="w-8 h-8 text-stone-600" />
          </div>
          <h3 className="text-lg font-bold text-[#111111] font-serif mb-2">尚無任何圖文冊</h3>
          <p className="text-sm text-stone-500 mb-6 max-w-xs mx-auto leading-relaxed">
            建立第一本圖文冊，開始上傳並體驗流暢的翻頁閱讀！
          </p>
          {!isViewOnly && (
            <button
              type="button"
              onClick={onCreateBookClick}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold text-white bg-[#111111] hover:bg-[#262626] rounded-full transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>立即建立</span>
            </button>
          )}
        </div>
      ) : (
        // ── 書架網格 ──
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
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

            return (
              <div
                key={book.id}
                className={`group relative bg-white rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-xl ${
                  isCurrent
                    ? 'border-[#111111] shadow-md ring-2 ring-[#111111]/10'
                    : 'border-[#E8E6E1] shadow-2xs hover:border-[#111111]'
                }`}
              >
                {/* 縮圖 + 標題區塊（可點擊翻閱） */}
                <div
                  onClick={() => onOpenViewerForBook(book)}
                  className="flex gap-4 items-start p-5 sm:p-6 cursor-pointer select-none"
                >
                  {/* 縮圖 */}
                  <div className="flex-shrink-0 w-20 h-24 sm:w-22 sm:h-28 rounded-2xl overflow-hidden bg-stone-100 flex items-center justify-center border border-[#E8E6E1] shadow-2xs group-hover:scale-102 transition-transform">
                    {sampleThumbnail ? (
                      <img
                        src={sampleThumbnail}
                        alt="preview"
                        className="w-full h-full object-cover filter brightness-[0.98]"
                      />
                    ) : (
                      <Image className="w-8 h-8 text-stone-400 opacity-60" />
                    )}
                  </div>

                  {/* 標題資訊 */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    {/* 分類標籤 */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200 mb-2">
                      <BookOpen className="w-3 h-3 text-stone-600" />
                      <span>圖文冊</span>
                    </span>

                    {/* 書名：優雅襯線體 */}
                    <h3 className="font-serif font-extrabold text-[#111111] text-lg sm:text-xl leading-snug line-clamp-2 group-hover:text-stone-700 transition-colors mb-2.5">
                      {book.title}
                    </h3>

                    {/* 統計：清晰高對比 */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-stone-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-stone-500" />
                        {studentCount} 位成員
                      </span>
                      <span className="flex items-center gap-1">
                        <Image className="w-3.5 h-3.5 text-stone-500" />
                        {totalPages} 張圖
                      </span>
                    </div>
                  </div>
                </div>

                {/* 修訂時間 */}
                <div className="px-5 sm:px-6 pb-3.5 flex items-center gap-1.5 text-xs font-medium text-stone-400">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-stone-400" />
                  <span>修訂於 {formatUpdateTime(book.updatedAt || book.createdAt)}</span>
                </div>

                {/* 分隔線 */}
                <div className="mx-5 sm:mx-6 border-t border-[#F0EEEA]" />

                {/* 操作按鈕區 */}
                <div className="p-4 sm:p-5 flex flex-col gap-2.5">
                  {/* 主要翻閱按鈕：純黑膠囊 */}
                  <button
                    type="button"
                    onClick={() => onOpenViewerForBook(book)}
                    disabled={studentCount === 0}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold text-white bg-[#111111] hover:bg-[#262626] rounded-full shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <BookOpen className="w-4 h-4 text-white" />
                    <span>開始翻閱</span>
                    <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* 次要按鈕列：細線膠囊按鈕 */}
                  <div className="flex items-center gap-2">
                    {/* 名單確認 */}
                    <button
                      type="button"
                      onClick={() => setQuickListBook(book)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#111111] bg-white hover:bg-stone-50 border border-[#DCD9D2] hover:border-[#111111] rounded-full transition-all cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-stone-600" />
                      <span>名單 ({studentCount})</span>
                    </button>

                    {/* 分享協作 */}
                    <button
                      type="button"
                      onClick={() => onOpenShareModal(book)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#111111] bg-white hover:bg-stone-50 border border-[#DCD9D2] hover:border-[#111111] rounded-full transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-stone-600" />
                      <span>分享</span>
                    </button>

                    {/* 下載 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadBookImages(book, setDownloadProgress);
                      }}
                      disabled={totalPages === 0}
                      className="inline-flex items-center justify-center w-9 h-9 text-[#111111] bg-white hover:bg-stone-50 border border-[#DCD9D2] hover:border-[#111111] rounded-full transition-all cursor-pointer disabled:opacity-30"
                      title="打包下載全冊圖片"
                    >
                      <Download className="w-4 h-4 text-stone-600" />
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
                        className="inline-flex items-center justify-center w-9 h-9 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
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
              className="group min-h-[220px] rounded-3xl border-2 border-dashed border-[#DCD9D2] hover:border-[#111111] bg-white/40 hover:bg-white transition-all duration-300 flex flex-col items-center justify-center p-6 text-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-white border border-[#DCD9D2] group-hover:border-[#111111] group-hover:scale-105 flex items-center justify-center text-stone-400 group-hover:text-[#111111] shadow-2xs transition-all duration-200 mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-[#111111] text-sm mb-1">
                建立新圖文冊
              </h4>
              <p className="text-xs text-stone-400 max-w-[180px] leading-relaxed">
                測驗成果、活動記錄、設計截圖…
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 快速名單彈窗 ── */}
      {quickListBook && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-stone-50 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh]">
            {/* 彈窗頂部 */}
            <div className="flex items-start justify-between p-5 pb-4 border-b border-stone-200 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-stone-900 line-clamp-1">
                  {quickListBook.title}
                </h3>
                <p className="text-sm text-stone-600 mt-0.5">
                  共 {Object.keys(quickListBook.students || {}).length} 位成員
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickListBook(null)}
                className="ml-3 flex-shrink-0 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 成員列表 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {Object.keys(quickListBook.students || {}).length === 0 ? (
                <div className="text-center py-10 text-stone-500 text-sm">
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
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-100 transition-colors group"
                      >
                        <span className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            setQuickListBook(null);
                            onOpenViewerForBook(quickListBook, personName);
                          }}
                        >
                          <p className="font-semibold text-stone-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                            {personName}
                          </p>
                          <p className="text-xs text-stone-500 font-medium">{imgCount} 張圖片</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadPersonImages(personName, folder?.images || [], setDownloadProgress);
                            }}
                            disabled={imgCount === 0}
                            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
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
                            className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
            <div className="p-4 border-t border-stone-200 flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => downloadBookImages(quickListBook, setDownloadProgress)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-stone-800 bg-stone-200 hover:bg-stone-300 rounded-xl transition-colors cursor-pointer"
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
                className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 px-3 py-2 rounded-xl transition-colors cursor-pointer"
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
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm animate-in slide-in-from-bottom duration-200">
          <FileDown className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{downloadProgress}</span>
        </div>
      )}
    </div>
  );
};
