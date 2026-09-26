import React from 'react';
import { 
  BookOpen, 
  Plus, 
  Users, 
  ArrowRight,
  Sparkles,
  Share2,
  Trash2,
  Layers,
  FileSpreadsheet,
  FolderOpen
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

          // 計算總頁數與首位學生
          let totalPages = 0;
          let firstStudentName: string | null = null;
          let sampleThumbnail: string | null = null;

          for (const sKey of studentKeys) {
            const folder = book.students[sKey];
            if (folder?.images?.length) {
              totalPages += folder.images.length;
              if (!firstStudentName) {
                firstStudentName = folder.studentName;
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
              {/* 冊子上方視覺區：精裝活頁夾 / 成績文件冊封面 (不再放大縮圖，改為典雅封面) */}
              <div 
                onClick={() => onOpenViewerForBook(book)}
                className="relative p-6 sm:p-7 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-stone-100 cursor-pointer overflow-hidden select-none"
                title="點擊直接打開並開始翻閱這本冊子"
              >
                {/* 書脊裝訂感 (金屬/皮革壓線) */}
                <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-stone-950 via-stone-800 to-transparent border-r border-amber-500/20" />
                
                {/* 精裝暗紋與邊框 */}
                <div className="absolute inset-2 border border-amber-500/15 rounded-xl pointer-events-none" />

                {/* 封面內容排版 */}
                <div className="relative z-10 flex flex-col h-40 justify-between pl-2">
                  {/* 頂部標章 */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-800/80 border border-stone-700 text-amber-300 text-[10px] font-mono tracking-wider font-bold">
                      <FolderOpen className="w-3 h-3 text-amber-400" />
                      #{book.shareCode || book.id.slice(-6)}
                    </span>

                    {/* 迷你若隱若現的微縮卡 (淡淡疊在右上角，不喧賓奪主) */}
                    {sampleThumbnail && (
                      <div className="w-10 h-12 rounded bg-stone-800 border border-stone-600 overflow-hidden shadow-lg transform rotate-6 opacity-60 group-hover:opacity-90 group-hover:rotate-3 transition-all">
                        <img 
                          src={sampleThumbnail} 
                          alt="preview" 
                          className="w-full h-full object-cover filter contrast-75 brightness-90" 
                        />
                      </div>
                    )}
                  </div>

                  {/* 冊子主標題燙金感 */}
                  <div className="my-auto py-2">
                    <h3 className="font-serif font-bold text-lg sm:text-xl text-stone-100 group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                      {book.title}
                    </h3>
                  </div>

                  {/* 底部收錄數據 */}
                  <div className="flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-800">
                    <div className="flex items-center gap-1.5 text-stone-300 font-medium">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>{studentCount} 位學生</span>
                      <span className="text-stone-600">·</span>
                      <span>{totalPages} 頁考卷</span>
                    </div>

                    <span className="text-[11px] text-amber-400/80 group-hover:text-amber-300 flex items-center gap-0.5 font-bold">
                      開卷翻閱 <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>

              {/* 冊子下方資訊與操作 */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-white border-t border-stone-100">
                <div className="flex items-center justify-between text-xs text-stone-500 mb-3">
                  <span className="truncate max-w-[180px]">
                    {firstStudentName ? `首位考卷：${firstStudentName}` : '尚無學生考卷'}
                  </span>
                  <span className="font-mono text-[11px] text-stone-400">
                    {new Date(book.updatedAt || book.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* 雙排動作鈕 */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  {/* 主要翻閱按鈕 */}
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

                  {/* 次要動作：學生名單、分享協作、刪除 */}
                  <div className="flex items-center justify-between gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => onSelectBook(book.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors font-medium text-[11px] cursor-pointer"
                      title="檢視此冊所有學生的卡片名單與管理"
                    >
                      <Layers className="w-3.5 h-3.5 text-stone-500" />
                      <span>查看名單 ({studentCount})</span>
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
                            if (confirm(`確定要刪除冊子「${book.title}」及其所有學生圖片嗎？`)) {
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

        {/* 新增冊子插槽卡片 */}
        {!isViewOnly && (
          <div
            onClick={onCreateBookClick}
            className="group min-h-[280px] rounded-2xl border-2 border-dashed border-stone-300 hover:border-amber-500/80 bg-stone-50/50 hover:bg-amber-50/20 transition-all duration-300 flex flex-col items-center justify-center p-6 text-center cursor-pointer"
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
