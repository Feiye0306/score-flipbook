import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Users, 
  ArrowRight,
  Sparkles,
  Share2,
  Trash2,
  Download,
  FolderOpen,
  Calendar,
  X,
  FileDown,
  ExternalLink
} from 'lucide-react';
import type { ExamBook } from '../types';
import { downloadBookImages, downloadPersonImages } from '../utils/zipExporter';

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
  // 快速確認名單彈窗 (免整頁跳轉)
  const [quickListBook, setQuickListBook] = useState<ExamBook | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);

  // 格式化修訂日期
  const formatUpdateTime = (timestamp?: number) => {
    if (!timestamp) return '近期修訂';
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 頂部典雅陳列室標題 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold tracking-wide border border-amber-200/60 mb-2">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>圖文冊陳列室</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif">
            我的翻閱相冊
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xl">
            點選任一本冊子封面即可直接進入全螢幕流暢翻閱，或點擊快速名冊確認人員。
          </p>
        </div>

        {!isViewOnly && (
          <button
            type="button"
            onClick={onCreateBookClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-stone-900 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-stone-700" />
            <span>建立新圖冊</span>
          </button>
        )}
      </div>

      {/* 冊子排列網格 (Bookshelf Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 sm:gap-7">
        {books.map((book) => {
          const studentKeys = Object.keys(book.students || {}).sort((a, b) => 
            a.localeCompare(b, 'zh-Hant')
          );
          const studentCount = studentKeys.length;

          // 計算總圖片數與微縮提示
          let totalPages = 0;
          let sampleThumbnail: string | null = null;

          for (const sKey of studentKeys) {
            const folder = book.students[sKey];
            if (folder?.images?.length) {
              totalPages += folder.images.length;
              if (!sampleThumbnail) {
                sampleThumbnail = folder.images[0].url;
              }
            }
          }

          const isCurrent = book.id === currentBookId;

          return (
            <div
              key={book.id}
              className={`group relative bg-white rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 ${
                isCurrent 
                  ? 'border-amber-400 ring-2 ring-amber-100' 
                  : 'border-stone-200/90 hover:border-stone-400/80'
              }`}
            >
              {/* 冊子封面 (典雅文件夾精裝質感，移除雜亂隨機碼與重複文字) */}
              <div 
                onClick={() => onOpenViewerForBook(book)}
                className="relative p-6 sm:p-7 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-stone-100 cursor-pointer overflow-hidden select-none"
                title="點擊直接打開並開始翻閱這本冊子"
              >
                {/* 書脊裝訂感 */}
                <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-stone-950 via-stone-800 to-transparent border-r border-amber-500/20" />
                
                {/* 精裝邊框 */}
                <div className="absolute inset-2 border border-amber-500/15 rounded-xl pointer-events-none" />

                {/* 封面內容排版 */}
                <div className="relative z-10 flex flex-col h-36 justify-between pl-2">
                  {/* 頂部：優雅分類圖標 + 迷你紙張疊放暗示 */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-800/80 border border-stone-700/80 text-amber-300 text-[11px] font-medium tracking-wide">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>精選圖冊</span>
                    </span>

                    {/* 迷你若隱若現的微縮卡 */}
                    {sampleThumbnail && (
                      <div className="w-9 h-11 rounded bg-stone-800 border border-stone-600 overflow-hidden shadow-md transform rotate-6 opacity-60 group-hover:opacity-90 transition-all">
                        <img 
                          src={sampleThumbnail} 
                          alt="preview" 
                          className="w-full h-full object-cover filter contrast-75 brightness-90" 
                        />
                      </div>
                    )}
                  </div>

                  {/* 冊子主標題 */}
                  <div className="my-auto py-1">
                    <h3 className="font-serif font-bold text-lg sm:text-xl text-stone-100 group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                      {book.title}
                    </h3>
                  </div>

                  {/* 底部數據：依指示簡化為「名單 X 人 · 共 Y 張圖」 */}
                  <div className="flex items-center justify-between text-xs text-stone-300 pt-2 border-t border-stone-800">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>名單 {studentCount} 人 · 共 {totalPages} 張圖</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 冊子下方資訊與操作 */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-white border-t border-stone-100">
                {/* 最後修訂日期 */}
                <div className="flex items-center justify-between text-[11px] text-stone-500 mb-3">
                  <span className="flex items-center gap-1 text-stone-400">
                    <Calendar className="w-3 h-3 text-stone-400" />
                    <span>最後修訂：{formatUpdateTime(book.updatedAt || book.createdAt)}</span>
                  </span>

                  {/* 整冊打包下載快捷鈕 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadBookImages(book, setDownloadProgress);
                    }}
                    disabled={totalPages === 0}
                    className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-900 hover:bg-stone-100 px-2 py-0.5 rounded transition-colors disabled:opacity-30 cursor-pointer"
                    title="將全冊所有成員圖片打包下載為 ZIP"
                  >
                    <Download className="w-3 h-3 text-stone-600" />
                    <span>打包下載</span>
                  </button>
                </div>

                {/* 操作按鈕群 */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  {/* 主要翻閱按鈕 (單一清晰入口，絕不重複) */}
                  <button
                    type="button"
                    onClick={() => onOpenViewerForBook(book)}
                    disabled={studentCount === 0}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:pointer-events-none rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>點擊進入翻頁閱讀</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* 次要動作列：快速確認名單彈窗 (免整頁跳轉)、分享協作、刪除 */}
                  <div className="flex items-center justify-between gap-1.5 text-xs">
                    {/* 點擊打開快速人員列表彈窗 (免展開全頁) */}
                    <button
                      type="button"
                      onClick={() => setQuickListBook(book)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-stone-700 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors font-bold text-[11px] cursor-pointer"
                      title="點擊查看名單快速確認 (免跳轉整頁)"
                    >
                      <Users className="w-3.5 h-3.5 text-stone-600" />
                      <span>名單確認 ({studentCount})</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenShareModal(book)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-colors font-bold text-[11px] cursor-pointer"
                        title="複製這本冊子的專屬協作分享連結 (他人可看可上傳)"
                      >
                        <Share2 className="w-3 h-3 text-amber-600" />
                        <span>分享協作</span>
                      </button>

                      {books.length > 1 && !isViewOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`確定要刪除冊子「${book.title}」及其所有圖片嗎？`)) {
                              onDeleteBook(book.id);
                            }
                          }}
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="刪除此冊"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* 建立新圖冊插槽卡片 */}
        {!isViewOnly && (
          <div
            onClick={onCreateBookClick}
            className="group min-h-[260px] rounded-2xl border-2 border-dashed border-stone-300 hover:border-amber-500/80 bg-stone-50/50 hover:bg-amber-50/20 transition-all duration-300 flex flex-col items-center justify-center p-6 text-center cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 group-hover:border-amber-300 group-hover:scale-110 flex items-center justify-center text-stone-400 group-hover:text-amber-600 shadow-sm transition-all duration-300 mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-stone-800 group-hover:text-amber-900 text-sm">
              建立新圖文冊
            </h4>
            <p className="text-xs text-stone-500 max-w-[200px] mt-1">
              例如：「專案設計截圖」、「活動成果記錄」、「測驗成果」
            </p>
          </div>
        )}
      </div>

      {/* 快速確認名單彈窗 (免整頁跳轉，支援分人打包與全冊打包) */}
      {quickListBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col p-5 sm:p-6 border border-stone-200">
            {/* 彈窗頂部 */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-700" />
                  <span>「{quickListBook.title}」人員名單</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  名單 {Object.keys(quickListBook.students || {}).length} 人 · 點選任一人員可直達翻閱
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickListBook(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 成員列表捲軸 */}
            <div className="flex-1 overflow-y-auto py-3 space-y-1.5 pr-1">
              {Object.keys(quickListBook.students || {}).length === 0 ? (
                <div className="text-center py-10 text-stone-400 text-xs">
                  此冊尚無任何人員資料
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
                        className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-stone-50 hover:bg-amber-50/50 border border-stone-200/80 transition-all group"
                      >
                        {/* 點擊直接開啟翻閱器看該人 */}
                        <div
                          onClick={() => {
                            setQuickListBook(null);
                            onOpenViewerForBook(quickListBook, personName);
                          }}
                          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                        >
                          <span className="w-6 h-6 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold font-mono">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-stone-900 text-xs sm:text-sm group-hover:text-amber-800 transition-colors truncate">
                              {personName}
                            </h4>
                            <span className="text-[11px] text-stone-500">
                              收錄 {imgCount} 張圖片
                            </span>
                          </div>
                        </div>

                        {/* 動作按鈕：分人打包下載 + 查看 */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadPersonImages(personName, folder?.images || [], setDownloadProgress);
                            }}
                            disabled={imgCount === 0}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                            title={`下載 ${personName} 的所有圖片`}
                          >
                            <Download className="w-3 h-3 text-stone-600" />
                            <span>下載</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setQuickListBook(null);
                              onOpenViewerForBook(quickListBook, personName);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>查看</span>
                            <ArrowRight className="w-3 h-3 text-amber-300" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* 彈窗底部：整冊打包下載 + 前往完整管理頁 */}
            <div className="pt-3 border-t border-stone-200 flex items-center justify-between gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => downloadBookImages(quickListBook, setDownloadProgress)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-stone-700" />
                <span>整冊全部打包下載 (ZIP)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickListBook(null);
                  onSelectBook(quickListBook.id);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <span>展開詳細管理</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 下載進度提示 Toast */}
      {downloadProgress && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-stone-100 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in slide-in-from-bottom duration-200">
          <FileDown className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{downloadProgress}</span>
        </div>
      )}
    </div>
  );
};
