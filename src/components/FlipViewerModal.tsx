import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Share2, 
  Check, 
  User, 
  Download,
  Users
} from 'lucide-react';
import type { ExamBook, StudentFolder, ScoreImage } from '../types';

interface FlipViewerModalProps {
  currentBook: ExamBook;
  initialStudentName: string;
  initialPageIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  isPrivateMode?: boolean;
}

export const FlipViewerModal: React.FC<FlipViewerModalProps> = ({
  currentBook,
  initialStudentName,
  initialPageIndex = 0,
  isOpen,
  onClose,
  isPrivateMode = false,
}) => {
  const [currentStudentName, setCurrentStudentName] = useState(initialStudentName);
  const [currentPageIndex, setCurrentPageIndex] = useState(initialPageIndex);
  
  // 縮放、旋轉、平移
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  // 手機滑動紀錄
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // 學生名單陣列
  const studentNames = Object.keys(currentBook.students || {}).sort();
  const currentStudentFolder: StudentFolder | undefined =
    currentBook.students?.[currentStudentName];
  const images: ScoreImage[] = currentStudentFolder?.images || [];

  const currentStudentIndex = studentNames.indexOf(currentStudentName);
  const prevStudentName = currentStudentIndex > 0 ? studentNames[currentStudentIndex - 1] : null;
  const nextStudentName = currentStudentIndex < studentNames.length - 1 ? studentNames[currentStudentIndex + 1] : null;

  // 重置位置
  const resetTransform = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentStudentName(initialStudentName);
      setCurrentPageIndex(initialPageIndex);
      resetTransform();
    }
  }, [isOpen, initialStudentName, initialPageIndex]);

  // 鍵盤操作：左右箭頭翻頁；Shift+左右箭頭切換學生
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (e.shiftKey) {
          goToNextStudent();
        } else {
          goToNextPage();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (e.shiftKey) {
          goToPrevStudent();
        } else {
          goToPrevPage();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        rotate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPageIndex, currentStudentName]);

  if (!isOpen || !currentStudentFolder) return null;

  const currentImage: ScoreImage | undefined = images[currentPageIndex] || images[0];

  // 1. 單純翻頁 (同一個學生考卷頁面切換，絕對不跳到別人)
  const goToNextPage = () => {
    if (currentPageIndex < images.length - 1) {
      resetTransform();
      setCurrentPageIndex((prev) => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPageIndex > 0) {
      resetTransform();
      setCurrentPageIndex((prev) => prev - 1);
    }
  };

  // 2. 切換學生 (獨立明確動作)
  const goToNextStudent = () => {
    if (nextStudentName) {
      resetTransform();
      setCurrentStudentName(nextStudentName);
      setCurrentPageIndex(0);
    }
  };

  const goToPrevStudent = () => {
    if (prevStudentName) {
      resetTransform();
      setCurrentStudentName(prevStudentName);
      setCurrentPageIndex(0);
    }
  };

  const rotate = () => setRotation((r) => (r + 90) % 360);

  // 拖曳移動
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // 手機滑動處理 (同一個學生左右翻頁)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (scale > 1) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      goToNextPage();
    } else if (diff < -50) {
      goToPrevPage();
    }
  };

  const [copiedType, setCopiedType] = useState<'collab' | 'student' | null>(null);

  // 複製本冊協作連結 (他人可看圖 + 可上傳)
  const copyBookCollabLink = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    const code = currentBook.shareCode || currentBook.id;
    url.searchParams.set('share', code);
    navigator.clipboard.writeText(url.toString());
    setCopiedType('collab');
    setTimeout(() => setCopiedType(null), 2000);
  };

  // 複製單一學生個人專屬連結 (唯讀看圖)
  const copyStudentLink = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    const code = currentBook.shareCode || currentBook.id;
    url.searchParams.set('share', code);
    url.searchParams.set('student', currentStudentName);
    navigator.clipboard.writeText(url.toString());
    setCopiedType('student');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex flex-col select-none overflow-hidden"
      onMouseUp={handleMouseUp}
    >
      {/* 頂部極簡沉浸工具列 */}
      <div className="h-14 px-3 sm:px-5 flex items-center justify-between text-white border-b border-white/10 bg-black/60 backdrop-blur-md z-30">
        {/* 左側：學生姓名與冊子進度 */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-indigo-600 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm">
            <User className="w-3.5 h-3.5" />
            <span className="max-w-[100px] sm:max-w-none truncate">{currentStudentName}</span>
          </div>

          {!isPrivateMode && (
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              ({currentStudentIndex + 1} / {studentNames.length} 人)
            </span>
          )}

          {/* 頁碼指示膠囊 */}
          <span className="text-xs text-indigo-200 font-semibold bg-white/10 px-2.5 py-0.5 rounded-full">
            第 {currentPageIndex + 1} / {images.length} 頁
          </span>
        </div>

        {/* 右側快捷動作 (去蕪存菁，避免臃腫) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 複製整冊協作分享連結 (他人可看可上傳) */}
          <button
            type="button"
            onClick={copyBookCollabLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            title="複製本冊專屬協作連結（他人點開可看圖、可上傳考卷）"
          >
            {copiedType === 'collab' ? (
              <Check className="w-3.5 h-3.5 text-slate-950" />
            ) : (
              <Users className="w-3.5 h-3.5 text-slate-950" />
            )}
            <span>{copiedType === 'collab' ? '已複製協作連結！' : '👥 分享本冊協作'}</span>
          </button>

          {/* 複製個人專屬連結 */}
          <button
            type="button"
            onClick={copyStudentLink}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-200 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 rounded-lg transition-colors cursor-pointer"
            title="僅複製此位學生的個人成績連結 (唯讀看圖)"
          >
            {copiedType === 'student' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedType === 'student' ? '已複製' : '個人唯讀連結'}</span>
          </button>

          {/* 順時針旋轉 90° */}
          <button
            type="button"
            onClick={rotate}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="旋轉圖片 90° (R)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* 原圖下載 */}
          {currentImage && (
            <a
              href={currentImage.url}
              download={`${currentStudentName}_第${currentPageIndex + 1}頁.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden sm:inline-flex"
              title="下載或原圖查看"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          {/* 關閉按鈕 */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 ml-1 text-slate-400 hover:text-white hover:bg-rose-600 rounded-lg transition-colors"
            title="關閉 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 主展示區 (滿版看圖 + 雙擊放大 + 滑動翻頁) */}
      <div 
        className="flex-1 relative flex items-center justify-center overflow-hidden p-1 sm:p-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {/* 左側翻頁箭頭 (僅翻同位學生的上一張考卷) */}
        {currentPageIndex > 0 && (
          <button
            type="button"
            onClick={goToPrevPage}
            className="absolute left-2 sm:left-4 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center border border-white/20 shadow-2xl transition-all hover:scale-105 active:scale-95"
            title="上一頁考卷"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}

        {/* 考卷圖片主體 */}
        {currentImage ? (
          <div
            className="transition-transform duration-100 ease-out max-w-full max-h-full flex items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={currentImage.url}
              alt={`${currentStudentName} 成績考卷截圖`}
              className="max-h-[calc(100vh-140px)] max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-80px)] object-contain shadow-2xl rounded-lg pointer-events-none"
              onDoubleClick={() => {
                if (scale === 1) {
                  setScale(2.2);
                } else {
                  resetTransform();
                }
              }}
            />
          </div>
        ) : (
          <div className="text-slate-400 text-sm">此學生尚無成績截圖</div>
        )}

        {/* 右側翻頁箭頭 (僅翻同位學生的下一張考卷) */}
        {currentPageIndex < images.length - 1 && (
          <button
            type="button"
            onClick={goToNextPage}
            className="absolute right-2 sm:right-4 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center border border-white/20 shadow-2xl transition-all hover:scale-105 active:scale-95"
            title="下一頁考卷"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        )}
      </div>

      {/* 底部功能 Dock：翻人與翻圖明確拆開 */}
      <div className="bg-black/75 border-t border-white/10 px-3 sm:px-6 py-2.5 flex flex-col gap-2 z-30 backdrop-blur-md">
        {/* 多頁指示器小圓點 (手機直覺預覽) */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-0.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  resetTransform();
                  setCurrentPageIndex(idx);
                }}
                className={`transition-all rounded-full ${
                  currentPageIndex === idx
                    ? 'w-5 h-1.5 bg-indigo-500'
                    : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                }`}
                title={`第 ${idx + 1} 頁`}
              />
            ))}
          </div>
        )}

        {/* 底部導覽：切換學生專屬按鈕列 */}
        <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto w-full">
          {/* 上一位學生 */}
          {!isPrivateMode && (
            <button
              type="button"
              disabled={!prevStudentName}
              onClick={goToPrevStudent}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-800/90 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-xl border border-white/10 shadow-sm active:scale-95 transition-all truncate"
            >
              <ChevronLeft className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span className="truncate">{prevStudentName ? `上一位：${prevStudentName}` : '已是第一位'}</span>
            </button>
          )}

          {/* 當前學生縮圖快速跳頁 (桌機顯示) */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto px-2">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => {
                  resetTransform();
                  setCurrentPageIndex(idx);
                }}
                className={`h-9 w-12 rounded-md overflow-hidden flex-shrink-0 border transition-all ${
                  currentPageIndex === idx
                    ? 'border-indigo-400 scale-105 ring-1 ring-indigo-400'
                    : 'border-white/20 opacity-40 hover:opacity-80'
                }`}
              >
                <img
                  src={img.url}
                  alt={`第 ${idx + 1} 頁`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* 下一位學生 */}
          {!isPrivateMode && (
            <button
              type="button"
              disabled={!nextStudentName}
              onClick={goToNextStudent}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:pointer-events-none rounded-xl shadow-md shadow-indigo-900/40 active:scale-95 transition-all truncate"
            >
              <span className="truncate">{nextStudentName ? `下一位：${nextStudentName}` : '已是最後一位'}</span>
              <ChevronRight className="w-4 h-4 text-white flex-shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
