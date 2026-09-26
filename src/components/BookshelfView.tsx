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

export interface BookTheme {
  id: string;
  name: string;
  bgGradient: string; // 封面主體漸層
  spineGradient: string; // 書脊裝訂感漸層
  borderStroke: string; // 精裝金屬燙印邊框
  badgeClass: string; // 分類標籤樣式
  iconColor: string; // 圖示顏色
  accentText: string; // 標題懸停/強調文字色
  bottomBorder: string; // 封面底部邊線
}

// 8 套精美經典藏書室高級色盤（沉穩、典雅、易於分辨）
export const BOOK_THEMES: BookTheme[] = [
  // 1. 經典藏青 (Midnight Navy & Champagne)
  {
    id: 'navy',
    name: '藏青金裝',
    bgGradient: 'from-[#0F1E36] via-[#162B4D] to-[#0A1526]',
    spineGradient: 'from-[#08101D] via-[#1A3258] to-transparent',
    borderStroke: 'border-sky-400/25',
    badgeClass: 'bg-sky-950/80 border-sky-600/40 text-sky-200',
    iconColor: 'text-sky-400',
    accentText: 'group-hover:text-sky-300',
    bottomBorder: 'border-sky-900/60',
  },
  // 2. 冷杉墨綠 (Imperial Forest & Gold)
  {
    id: 'forest',
    name: '冷杉翠綠',
    bgGradient: 'from-[#0D241C] via-[#16382C] to-[#081712]',
    spineGradient: 'from-[#05100C] via-[#1B4234] to-transparent',
    borderStroke: 'border-emerald-400/25',
    badgeClass: 'bg-emerald-950/80 border-emerald-600/40 text-emerald-200',
    iconColor: 'text-emerald-400',
    accentText: 'group-hover:text-emerald-300',
    bottomBorder: 'border-emerald-900/60',
  },
  // 3. 英倫酒紅 (Royal Burgundy & Brass)
  {
    id: 'burgundy',
    name: '典雅酒紅',
    bgGradient: 'from-[#2D1217] via-[#421A22] to-[#1C0B0E]',
    spineGradient: 'from-[#140608] via-[#4D1E27] to-transparent',
    borderStroke: 'border-rose-400/25',
    badgeClass: 'bg-rose-950/80 border-rose-600/40 text-rose-200',
    iconColor: 'text-rose-400',
    accentText: 'group-hover:text-rose-300',
    bottomBorder: 'border-rose-900/60',
  },
  // 4. 焦糖暖褐 (Caramel Saddle & Ochre)
  {
    id: 'saddle',
    name: '焦糖皮質',
    bgGradient: 'from-[#2F1D12] via-[#442A1A] to-[#1D120B]',
    spineGradient: 'from-[#130B07] via-[#4F311F] to-transparent',
    borderStroke: 'border-amber-400/30',
    badgeClass: 'bg-amber-950/80 border-amber-600/40 text-amber-200',
    iconColor: 'text-amber-400',
    accentText: 'group-hover:text-amber-300',
    bottomBorder: 'border-amber-900/60',
  },
  // 5. 曜石夜黑 (Onyx & Champagne Gold)
  {
    id: 'onyx',
    name: '曜石夜黑',
    bgGradient: 'from-[#18191D] via-[#23252B] to-[#101114]',
    spineGradient: 'from-[#0A0A0C] via-[#2A2C34] to-transparent',
    borderStroke: 'border-amber-500/20',
    badgeClass: 'bg-stone-800/80 border-stone-600/50 text-amber-300',
    iconColor: 'text-amber-400',
    accentText: 'group-hover:text-amber-300',
    bottomBorder: 'border-stone-800',
  },
  // 6. 紫檀幽蘭 (Plum Violet & Amethyst)
  {
    id: 'plum',
    name: '紫檀幽蘭',
    bgGradient: 'from-[#25172E] via-[#372344] to-[#170E1D]',
    spineGradient: 'from-[#0E0812] via-[#422A52] to-transparent',
    borderStroke: 'border-purple-400/25',
    badgeClass: 'bg-purple-950/80 border-purple-600/40 text-purple-200',
    iconColor: 'text-purple-400',
    accentText: 'group-hover:text-purple-300',
    bottomBorder: 'border-purple-900/60',
  },
  // 7. 藍灰石青 (Slate Petrol & Steel)
  {
    id: 'petrol',
    name: '藍灰石青',
    bgGradient: 'from-[#142329] via-[#1E333B] to-[#0D161A]',
    spineGradient: 'from-[#080E10] via-[#243E47] to-transparent',
    borderStroke: 'border-teal-400/25',
    badgeClass: 'bg-teal-950/80 border-teal-600/40 text-teal-200',
    iconColor: 'text-teal-400',
    accentText: 'group-hover:text-teal-300',
    bottomBorder: 'border-teal-900/60',
  },
  // 8. 摩卡陶土 (Mocha Terracotta)
  {
    id: 'mocha',
    name: '摩卡陶土',
    bgGradient: 'from-[#2B1E19] via-[#3D2B24] to-[#1A120E]',
    spineGradient: 'from-[#100A08] via-[#4A342B] to-transparent',
    borderStroke: 'border-orange-400/25',
    badgeClass: 'bg-orange-950/80 border-orange-600/40 text-orange-200',
    iconColor: 'text-orange-400',
    accentText: 'group-hover:text-orange-300',
    bottomBorder: 'border-orange-900/60',
  },
];

export function getBookTheme(bookId: string, title: string): BookTheme {
  const str = bookId + title;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % BOOK_THEMES.length;
  return BOOK_THEMES[index];
}

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

      {/* 冊子排列網格 (Bookshelf Grid) 或 典雅空狀態 */}
      {books.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-stone-200/90 shadow-xs max-w-lg mx-auto animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <BookOpen className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-stone-900 font-serif mb-1">
            書架目前尚無圖文冊
          </h3>
          <p className="text-xs text-stone-500 mb-6 leading-relaxed max-w-xs mx-auto">
            您可以立即建立一本專屬的圖冊或相簿資料夾，開始上傳並體驗流暢的翻頁閱讀！
          </p>
          {!isViewOnly && (
            <button
              type="button"
              onClick={onCreateBookClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>＋ 立即建立第一本圖文冊</span>
            </button>
          )}
        </div>
      ) : (
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
          const theme = getBookTheme(book.id, book.title);

          return (
            <div
              key={book.id}
              className={`group relative rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-1.5 bg-gradient-to-b ${theme.bgGradient} ${
                isCurrent 
                  ? 'border-amber-400 ring-4 ring-amber-400/30 shadow-amber-950/40' 
                  : 'border-white/15 hover:border-amber-400/60'
              }`}
            >
              {/* 書脊裝訂感 (立體微光影貫穿整冊) */}
              <div className={`absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r ${theme.spineGradient} border-r ${theme.borderStroke} z-20 pointer-events-none`} />

              {/* 燙印邊框裝飾 */}
              <div className={`absolute inset-2 border ${theme.borderStroke} rounded-xl pointer-events-none z-20`} />

              {/* 冊子封面主要展示區 */}
              <div 
                onClick={() => onOpenViewerForBook(book)}
                className="relative p-6 sm:p-7 text-white cursor-pointer overflow-hidden select-none transition-transform active:scale-[0.99] z-10"
                title="點擊直接打開並開始翻閱這本冊子"
              >
                {/* 封面內容排版 */}
                <div className="relative flex flex-col min-h-[140px] justify-between pl-2">
                  {/* 頂部：優雅分類徽記 + 書色標記 */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs sm:text-sm font-semibold tracking-wide ${theme.badgeClass}`}>
                      <FolderOpen className={`w-4 h-4 ${theme.iconColor}`} />
                      <span>{theme.name}</span>
                    </span>

                    {/* 迷你若隱若現的微縮卡 */}
                    {sampleThumbnail && (
                      <div className="w-10 h-12 rounded-lg bg-black/50 border border-white/30 overflow-hidden shadow-lg transform rotate-6 opacity-85 group-hover:opacity-100 group-hover:rotate-0 transition-all duration-300">
                        <img 
                          src={sampleThumbnail} 
                          alt="preview" 
                          className="w-full h-full object-cover filter contrast-105 brightness-95" 
                        />
                      </div>
                    )}
                  </div>

                  {/* 冊子主標題：大字號、立體、極致清晰 */}
                  <div className="my-3 py-1">
                    <h3 className={`font-serif font-extrabold text-xl sm:text-2xl text-white ${theme.accentText} transition-colors line-clamp-2 leading-snug tracking-normal drop-shadow-md`}>
                      {book.title}
                    </h3>
                  </div>

                  {/* 底部數據：大字清晰「名單 X 人 · 共 Y 張圖」 */}
                  <div className={`flex items-center justify-between text-sm sm:text-base text-amber-200/95 font-bold pt-2.5 border-t ${theme.bottomBorder}`}>
                    <div className="flex items-center gap-2">
                      <Users className={`w-4 h-4 ${theme.iconColor}`} />
                      <span>名單 {studentCount} 人 · 共 {totalPages} 張圖</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 冊子下方資訊與操作 (一體化深色暗調底座，徹底告別刺眼白底) */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-black/40 backdrop-blur-xs border-t border-white/10 z-10">
                {/* 最後修訂日期與打包下載：字體放大、對比鮮明 */}
                <div className="flex items-center justify-between text-xs sm:text-sm text-stone-200 mb-3.5 pl-1.5">
                  <span className="flex items-center gap-1.5 text-stone-300 font-medium">
                    <Calendar className="w-4 h-4 text-amber-400" />
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
                    className="inline-flex items-center gap-1.5 text-stone-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-30 cursor-pointer font-medium text-xs sm:text-sm"
                    title="將全冊所有成員圖片打包下載為 ZIP"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-300" />
                    <span>打包下載</span>
                  </button>
                </div>

                {/* 操作按鈕群 */}
                <div className="space-y-2.5 pt-2.5 border-t border-white/10">
                  {/* 主要翻閱按鈕：燙金銘牌奢華感，大字霸氣易點擊 */}
                  <button
                    type="button"
                    onClick={() => onOpenViewerForBook(book)}
                    disabled={studentCount === 0}
                    className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 text-sm sm:text-base font-extrabold text-stone-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 disabled:pointer-events-none rounded-xl shadow-lg transition-all active:scale-98 cursor-pointer tracking-wide"
                  >
                    <BookOpen className="w-4 h-4 text-stone-950" />
                    <span>點擊進入翻頁閱讀</span>
                    <ArrowRight className="w-4 h-4 text-stone-900 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* 次要動作列：快速確認名單彈窗 (免整頁跳轉)、分享協作、刪除 */}
                  <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                    {/* 點擊打開快速人員列表彈窗 (免展開全頁) */}
                    <button
                      type="button"
                      onClick={() => setQuickListBook(book)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-stone-100 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl transition-all font-bold text-xs sm:text-sm cursor-pointer"
                      title="點擊查看名單快速確認 (免跳轉整頁)"
                    >
                      <Users className="w-4 h-4 text-amber-300" />
                      <span>名單確認 ({studentCount})</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenShareModal(book)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 rounded-xl transition-all font-bold text-xs sm:text-sm cursor-pointer"
                        title="複製這本冊子的專屬協作分享連結 (他人可看可上傳)"
                      >
                        <Share2 className="w-3.5 h-3.5 text-amber-300" />
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
                          className="p-1.5 text-stone-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer"
                          title="刪除此冊"
                        >
                          <Trash2 className="w-4 h-4" />
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
            className="group min-h-[280px] rounded-2xl border-2 border-dashed border-stone-300 hover:border-amber-500 bg-stone-50/60 hover:bg-amber-50/30 transition-all duration-300 flex flex-col items-center justify-center p-6 text-center cursor-pointer shadow-xs"
          >
            <div className="w-14 h-14 rounded-2xl bg-white border border-stone-200 group-hover:border-amber-400 group-hover:scale-110 flex items-center justify-center text-stone-400 group-hover:text-amber-600 shadow-sm transition-all duration-300 mb-3.5">
              <Plus className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-stone-900 group-hover:text-amber-900 text-base">
              建立新圖文冊
            </h4>
            <p className="text-xs sm:text-sm text-stone-600 max-w-[220px] mt-1.5 leading-relaxed">
              例如：「專案設計截圖」、「活動成果記錄」、「測驗成果」
            </p>
          </div>
        )}
      </div>
      )}

      {/* 快速確認名單彈窗 (免整頁跳轉，支援分人打包與全冊打包) */}
      {quickListBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col p-5 sm:p-6 border border-stone-200">
            {/* 彈窗頂部 */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-stone-900 font-serif flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-600" />
                  <span>「{quickListBook.title}」人員名單</span>
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">
                  名單共 {Object.keys(quickListBook.students || {}).length} 人 · 點選任一人員可直達翻閱
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickListBook(null)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 成員列表捲軸 */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
              {Object.keys(quickListBook.students || {}).length === 0 ? (
                <div className="text-center py-10 text-stone-500 text-sm">
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
                        className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-amber-50/60 border border-stone-200 transition-all group"
                      >
                        {/* 點擊直接開啟翻閱器看該人 */}
                        <div
                          onClick={() => {
                            setQuickListBook(null);
                            onOpenViewerForBook(quickListBook, personName);
                          }}
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        >
                          <span className="w-7 h-7 rounded-full bg-stone-200 text-stone-800 flex items-center justify-center text-xs font-bold font-mono">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-stone-900 text-sm sm:text-base group-hover:text-amber-800 transition-colors truncate">
                              {personName}
                            </h4>
                            <span className="text-xs text-stone-600 font-medium">
                              收錄 {imgCount} 張圖片
                            </span>
                          </div>
                        </div>

                        {/* 動作按鈕：分人打包下載 + 查看 */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadPersonImages(personName, folder?.images || [], setDownloadProgress);
                            }}
                            disabled={imgCount === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-800 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                            title={`下載 ${personName} 的所有圖片`}
                          >
                            <Download className="w-3.5 h-3.5 text-stone-700" />
                            <span>下載</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setQuickListBook(null);
                              onOpenViewerForBook(quickListBook, personName);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>查看</span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
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
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-700" />
                <span>整冊全部打包下載 (ZIP)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickListBook(null);
                  onSelectBook(quickListBook.id);
                }}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-stone-700 hover:text-stone-950 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <span>展開詳細管理</span>
                <ExternalLink className="w-4 h-4" />
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
