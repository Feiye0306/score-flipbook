import React from 'react';
import { 
  BookOpen, 
  Plus, 
  Users, 
  Calendar, 
  ArrowRight,
  Eye,
  Layers,
  Sparkles,
  Share2,
  Trash2
} from 'lucide-react';
import type { ExamBook } from '../types';

interface BookshelfViewProps {
  books: ExamBook[];
  currentBookId: string;
  onSelectBook: (bookId: string) => void;
  onOpenViewerForBook: (book: ExamBook) => void;
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
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 頂部典雅書架標題區 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold tracking-wide border border-amber-200/60 mb-2">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>成績冊陳列室</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif">
            我的測驗成績冊
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xl">
            點選任一本冊子封面即可直接進入全螢幕流暢翻閱，或分享專屬協作連結給他人。
          </p>
        </div>

        {!isViewOnly && (
          <button
            type="button"
            onClick={onCreateBookClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-stone-900 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-stone-700" />
            <span>新增成績冊</span>
          </button>
        )}
      </div>

      {/* 冊子排列網格 (Bookshelf Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 sm:gap-7">
        {books.map((book) => {
          const studentKeys = Object.keys(book.students || {});
          const studentCount = studentKeys.length;

          // 計算總頁數與取得封面縮圖
          let totalPages = 0;
          let coverUrl: string | null = null;
          let firstStudentName: string | null = null;

          for (const sKey of studentKeys) {
            const folder = book.students[sKey];
            if (folder?.images?.length) {
              totalPages += folder.images.length;
              if (!coverUrl) {
                coverUrl = folder.images[0].url;
                firstStudentName = folder.studentName;
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
              {/* 冊子上方視覺區：立體書本效果與封面 */}
              <div 
                onClick={() => onOpenViewerForBook(book)}
                className="relative p-5 pb-4 bg-gradient-to-b from-stone-50/80 to-stone-100/50 cursor-pointer overflow-hidden select-none border-b border-stone-100"
                title="點擊直接打開並開始翻閱這本冊子"
              >
                {/* 冊子書脊微立體裝飾 */}
                <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-stone-300 via-stone-200 to-transparent opacity-60 pointer-events-none" />

                {/* 封面預覽卡片 (擬真活頁夾紙張層疊質感) */}
                <div className="relative mx-auto w-full max-w-[240px] aspect-[4/3] flex items-center justify-center">
                  {/* 底層紙張陰影疊放 */}
                  <div className="absolute inset-0 bg-stone-200 rounded-lg transform translate-x-2 -translate-y-1 shadow-sm opacity-50" />
                  <div className="absolute inset-0 bg-stone-100 rounded-lg transform translate-x-1 -translate-y-0.5 shadow-sm opacity-70" />

                  {/* 頂層主封面 */}
                  <div className="relative w-full h-full bg-white rounded-lg border border-stone-200/90 shadow-md overflow-hidden flex flex-col group-hover:shadow-lg transition-shadow">
                    {coverUrl ? (
                      <div className="relative w-full h-full bg-stone-50 overflow-hidden">
                        <img
                          src={coverUrl}
                          alt={book.title}
                          className="w-full h-full object-cover object-top filter brightness-[0.98] group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* 懸浮提示遮罩 */}
                        <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-stone-900 text-xs font-bold shadow-md">
                            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                            點擊開卷翻閱
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50/80 text-stone-400 p-4 text-center">
                        <BookOpen className="w-8 h-8 text-stone-300 mb-1" />
                        <span className="text-[11px] text-stone-500">尚無考卷圖片</span>
                        <span className="text-[10px] text-stone-400 mt-0.5">點擊進入上傳</span>
                      </div>
                    )}

                    {/* 書籍角標金漆感 */}
                    <div className="absolute top-2 right-2 bg-stone-900/80 backdrop-blur-sm text-stone-100 text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                      {studentCount} 位學生 · {totalPages} 頁
                    </div>
                  </div>
                </div>

                {/* 冊子代碼徽章 */}
                {book.shareCode && (
                  <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                    <span className="bg-stone-200/70 text-stone-700 px-2 py-0.5 rounded text-[10px]">
                      #{book.shareCode}
                    </span>
                    {firstStudentName && (
                      <span className="text-[11px] text-stone-500 truncate max-w-[140px]">
                        首位：{firstStudentName}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 冊子資訊與標題 */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 
                    onClick={() => onOpenViewerForBook(book)}
                    className="font-bold text-base sm:text-lg text-stone-900 hover:text-amber-700 cursor-pointer line-clamp-2 tracking-tight transition-colors"
                  >
                    {book.title}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-1">
                    共收錄 {studentCount} 位學生，點擊封面直接順序翻閱考卷。
                  </p>
                </div>

                {/* 底部雙排快捷動作鈕 */}
                <div className="pt-4 mt-3 border-t border-stone-100 space-y-2">
                  {/* 主要翻閱大按鈕 */}
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

                  {/* 次要動作列：展開名單、分享協作、刪除 */}
                  <div className="flex items-center justify-between gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => onSelectBook(book.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors font-medium text-[11px]"
                      title="檢視此冊所有學生的卡片名單與管理"
                    >
                      <Layers className="w-3.5 h-3.5 text-stone-500" />
                      <span>學生卡片名單</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenShareModal(book)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-colors font-bold text-[11px]"
                        title="複製這本冊子的專屬協作分享連結 (他人可看可上傳)"
                      >
                        <Share2 className="w-3 h-3 text-amber-600" />
                        <span>分享協作</span>
                      </button>

                      {books.length > 1 && !isViewOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`確定要刪除冊子「${book.title}」及其所有學生圖片嗎？`)) {
                              onDeleteBook(book.id);
                            }
                          }}
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

        {/* 新增冊子插槽卡片 */}
        {!isViewOnly && (
          <div
            onClick={onCreateBookClick}
            className="group min-h-[320px] rounded-2xl border-2 border-dashed border-stone-300 hover:border-amber-500/80 bg-stone-50/50 hover:bg-amber-50/20 transition-all duration-300 flex flex-col items-center justify-center p-6 text-center cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 group-hover:border-amber-300 group-hover:scale-110 flex items-center justify-center text-stone-400 group-hover:text-amber-600 shadow-sm transition-all duration-300 mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-stone-800 group-hover:text-amber-900 text-sm">
              建立新測驗冊子
            </h4>
            <p className="text-xs text-stone-500 max-w-[200px] mt-1">
              例如：「113第一次段考數學」、「九月模考自然」
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
