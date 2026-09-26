import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Share2, 
  Check, 
  User, 
  ArrowLeftRight,
  Download
} from 'lucide-react';
import type { ExamBook, StudentFolder, ScoreImage } from '../types';

interface FlipViewerModalProps {
  currentBook: ExamBook;
  initialStudentName: string;
  initialPageIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  isPrivateMode?: boolean; // 若為個別學生專屬模式，不顯示跨學生切換
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
  
  // 檢視狀態 (縮放、旋轉、平移)
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  // 手勢滑動 (Touch Swipe) 記錄
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // 學生名單陣列
  const studentNames = Object.keys(currentBook.students || {}).sort();
  const currentStudentFolder: StudentFolder | undefined =
    currentBook.students?.[currentStudentName];
  const images: ScoreImage[] = currentStudentFolder?.images || [];

  // 當 initialStudentName 改變時更新
  useEffect(() => {
    if (isOpen) {
      setCurrentStudentName(initialStudentName);
      setCurrentPageIndex(initialPageIndex);
      resetTransform();
    }
  }, [isOpen, initialStudentName, initialPageIndex]);

  // 重置圖片視角
  const resetTransform = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // 鍵盤快速鍵監聽
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrev();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === 'r' || e.key === 'R') {
        rotate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPageIndex, currentStudentName]);

  if (!isOpen || !currentStudentFolder) return null;

  const currentImage: ScoreImage | undefined = images[currentPageIndex] || images[0];

  // 下一張 (同學生下一頁，最後一頁則切換下一位學生)
  const goToNext = () => {
    resetTransform();
    if (currentPageIndex < images.length - 1) {
      setCurrentPageIndex((prev) => prev + 1);
    } else if (!isPrivateMode) {
      // 切換下一位學生
      const currentIndex = studentNames.indexOf(currentStudentName);
      if (currentIndex < studentNames.length - 1) {
        const nextStudent = studentNames[currentIndex + 1];
        setCurrentStudentName(nextStudent);
        setCurrentPageIndex(0);
      }
    }
  };

  // 上一張 (同學生上一頁，第一頁則切換上一位學生)
  const goToPrev = () => {
    resetTransform();
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    } else if (!isPrivateMode) {
      // 切換上一位學生
      const currentIndex = studentNames.indexOf(currentStudentName);
      if (currentIndex > 0) {
        const prevStudent = studentNames[currentIndex - 1];
        const prevFolder = currentBook.students[prevStudent];
        setCurrentStudentName(prevStudent);
        setCurrentPageIndex(Math.max(0, (prevFolder?.images.length || 1) - 1));
      }
    }
  };

  // 縮放操作
  const zoomIn = () => setScale((s) => Math.min(s + 0.3, 4));
  const zoomOut = () => {
    setScale((s) => {
      const next = Math.max(s - 0.3, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const rotate = () => setRotation((r) => (r + 90) % 360);

  // 滾輪縮放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  // 拖曳移動 (放大後查看細節)
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 手機觸控滑動處理
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (scale > 1) return; // 放大時不觸發手勢翻頁
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      goToNext(); // 向左滑動 -> 下一頁
    } else if (diff < -50) {
      goToPrev(); // 向右滑動 -> 上一頁
    }
  };

  // 複製個人專屬連結
  const copyStudentLink = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('book', currentBook.id);
    url.searchParams.set('student', currentStudentName);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStudentIndex = studentNames.indexOf(currentStudentName);
  const hasPrev = currentPageIndex > 0 || (!isPrivateMode && currentStudentIndex > 0);
  const hasNext =
    currentPageIndex < images.length - 1 ||
    (!isPrivateMode && currentStudentIndex < studentNames.length - 1);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col select-none animate-in fade-in duration-200"
      onMouseUp={handleMouseUp}
    >
      {/* 頂部操作列 */}
      <div className="h-14 px-4 flex items-center justify-between text-white border-b border-white/10 bg-black/40">
        {/* 左側：學生名字與頁數資訊 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-indigo-600/80 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm">
            <User className="w-3.5 h-3.5" />
            <span>{currentStudentName}</span>
          </div>

          <div className="text-xs text-slate-300 font-medium">
            第 <span className="text-white font-bold">{currentPageIndex + 1}</span> / {images.length} 頁
          </div>

          {!isPrivateMode && (
            <span className="hidden sm:inline-block text-[11px] text-slate-400">
              (全班第 {currentStudentIndex + 1} / {studentNames.length} 人)
            </span>
          )}
        </div>

        {/* 右側：功能按鈕群 (縮放、旋轉、分享專屬連結、下載、關閉) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 個人專屬連結複製 */}
          <button
            type="button"
            onClick={copyStudentLink}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-200 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 rounded-lg transition-colors cursor-pointer"
            title="複製此學生的專屬分享連結 (其他人點開只會看到該學生的成績圖)"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copied ? '已複製個人連結' : '複製個人連結'}</span>
          </button>

          {/* 旋轉按鈕 */}
          <button
            type="button"
            onClick={rotate}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="順時針旋轉 90° (R)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* 縮小 */}
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= 1}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 rounded-lg transition-colors"
            title="縮小 (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* 放大 */}
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= 4}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 rounded-lg transition-colors"
            title="放大 (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* 重設大小 */}
          {scale > 1 && (
            <button
              type="button"
              onClick={resetTransform}
              className="text-[11px] px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-white transition-colors"
            >
              100%
            </button>
          )}

          {/* 下載原圖 */}
          {currentImage && (
            <a
              href={currentImage.url}
              download={`${currentStudentName}_第${currentPageIndex + 1}頁.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="下載或原圖開啟"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          {/* 關閉按鈕 */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 ml-2 text-slate-400 hover:text-white hover:bg-rose-600/80 rounded-lg transition-colors"
            title="關閉 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 主展示區 (超流暢大圖翻閱) */}
      <div 
        className="flex-1 relative flex items-center justify-center overflow-hidden p-2 sm:p-6"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {/* 左側翻頁按鈕 */}
        {hasPrev && (
          <button
            type="button"
            onClick={goToPrev}
            className="absolute left-2 sm:left-4 z-20 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-xl transition-all hover:scale-105"
            title="上一頁 / 上一位學生 (←)"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}

        {/* 考卷原圖 */}
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
              className="max-h-[calc(100vh-140px)] max-w-[calc(100vw-30px)] sm:max-w-[calc(100vw-120px)] object-contain shadow-2xl rounded-lg pointer-events-none"
              onDoubleClick={() => {
                if (scale === 1) {
                  setScale(2);
                } else {
                  resetTransform();
                }
              }}
            />
          </div>
        ) : (
          <div className="text-slate-400 text-sm">此學生尚無成績截圖</div>
        )}

        {/* 右側翻頁按鈕 */}
        {hasNext && (
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-2 sm:right-4 z-20 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-xl transition-all hover:scale-105"
            title="下一頁 / 下一位學生 (→)"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        )}
      </div>

      {/* 底部導覽列 (縮圖列與快速跳頁) */}
      <div className="h-16 bg-black/50 border-t border-white/10 px-4 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        {/* 左側學生快速選單 (非私密模式) */}
        {!isPrivateMode && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[11px] text-slate-400 hidden sm:inline">切換學生：</span>
            <select
              aria-label="切換學生"
              value={currentStudentName}
              onChange={(e) => {
                setCurrentStudentName(e.target.value);
                setCurrentPageIndex(0);
                resetTransform();
              }}
              className="bg-slate-800 text-xs font-semibold text-white px-2.5 py-1 rounded-md border border-slate-700 outline-none cursor-pointer"
            >
              {studentNames.map((s) => (
                <option key={s} value={s}>
                  {s} ({currentBook.students[s]?.images.length || 0}頁)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 中間：當前學生所有頁面縮圖列表 */}
        <div className="flex items-center gap-2 mx-auto overflow-x-auto py-1">
          {images.map((img, idx) => (
            <button
              key={img.id || idx}
              type="button"
              onClick={() => {
                setCurrentPageIndex(idx);
                resetTransform();
              }}
              className={`h-11 w-14 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all ${
                currentPageIndex === idx
                  ? 'border-indigo-400 scale-105 ring-2 ring-indigo-500/50'
                  : 'border-white/20 opacity-50 hover:opacity-90'
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

        {/* 翻頁提示說明 */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 flex-shrink-0">
          <span>鍵盤「← / →」翻頁</span>
          <span>「滾輪 / 雙擊」放大</span>
        </div>
      </div>
    </div>
  );
};
