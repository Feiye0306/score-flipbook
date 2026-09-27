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
  Users,
  BookOpen,
  List,
  Search,
  FileText,
  Trash2
} from 'lucide-react';
import type { ExamBook, StudentFolder, ScoreImage } from '../types';

interface FlipViewerModalProps {
  currentBook: ExamBook;
  initialStudentName: string;
  initialPageIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  isPrivateMode?: boolean;
  isViewOnly?: boolean;
  onDeleteImage?: (bookId: string, studentName: string, imageId: string) => Promise<void> | void;
  onDeleteStudent?: (bookId: string, studentName: string) => Promise<void> | void;
}

export const FlipViewerModal: React.FC<FlipViewerModalProps> = ({
  currentBook,
  initialStudentName,
  initialPageIndex = 0,
  isOpen,
  onClose,
  isPrivateMode = false,
  isViewOnly = false,
  onDeleteImage,
  onDeleteStudent,
}) => {
  const [currentStudentName, setCurrentStudentName] = useState(initialStudentName);
  const [currentPageIndex, setCurrentPageIndex] = useState(initialPageIndex);
  
  // 側邊學生總目錄抽屜
  const [showDirectory, setShowDirectory] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');

  // 縮放、旋轉、平移
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copiedType, setCopiedType] = useState<'collab' | 'student' | null>(null);

  // 看圖容器 Ref (用於綁定 passive: false 的 wheel 事件)
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // 手機滑動紀錄
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // 學生名單陣列 (依繁體中文姓名筆畫排序)
  const studentNames = Object.keys(currentBook.students || {}).sort((a, b) => 
    a.localeCompare(b, 'zh-Hant')
  );
  
  const currentStudentFolder: StudentFolder | undefined =
    currentBook.students?.[currentStudentName];
  const images: ScoreImage[] = currentStudentFolder?.images || [];

  const currentStudentIndex = studentNames.indexOf(currentStudentName);
  const prevStudentName = currentStudentIndex > 0 ? studentNames[currentStudentIndex - 1] : null;
  const nextStudentName = currentStudentIndex < studentNames.length - 1 ? studentNames[currentStudentIndex + 1] : null;

  // 重置位置與縮放
  const resetTransform = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  // 滾輪縮放監聽 (阻止外層默認滾動，支援 1x ~ 6x 平滑縮放)
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container || !isOpen) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
      setScale((prevScale) => {
        const nextScale = Math.min(Math.max(Number((prevScale * zoomFactor).toFixed(2)), 1), 6);
        if (nextScale <= 1) {
          setPosition({ x: 0, y: 0 });
        }
        return nextScale;
      });
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelNative);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStudentName(initialStudentName);
      setCurrentPageIndex(initialPageIndex);
      setShowDirectory(false);
      resetTransform();
    }
  }, [isOpen, initialStudentName, initialPageIndex]);

  // 鍵盤操作：左右箭頭翻頁；Shift+左右箭頭切換學生
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDirectory) {
          setShowDirectory(false);
        } else {
          onClose();
        }
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
  }, [isOpen, currentPageIndex, currentStudentName, showDirectory]);

  if (!isOpen || !currentStudentFolder) return null;

  const currentImage: ScoreImage | undefined = images[currentPageIndex] || images[0];

  // 1. 單純翻頁 (同一個學生考卷頁面切換)
  const goToNextPage = () => {
    if (currentPageIndex < images.length - 1) {
      resetTransform();
      setCurrentPageIndex((prev) => prev + 1);
    } else if (nextStudentName) {
      // 若已是此學生最後一頁，再次按下一頁自動順暢進入下一位學生的第1頁
      resetTransform();
      setCurrentStudentName(nextStudentName);
      setCurrentPageIndex(0);
    }
  };

  const goToPrevPage = () => {
    if (currentPageIndex > 0) {
      resetTransform();
      setCurrentPageIndex((prev) => prev - 1);
    } else if (prevStudentName) {
      // 若是第1頁按上一頁，跳到上一位學生的最後一頁
      resetTransform();
      const prevImages = currentBook.students?.[prevStudentName]?.images || [];
      setCurrentStudentName(prevStudentName);
      setCurrentPageIndex(prevImages.length > 0 ? prevImages.length - 1 : 0);
    }
  };

  // 2. 切換學生
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

  // 手機滑動處理
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

  // 刪除當前正在檢視的圖片
  const handleDeleteCurrentImage = async () => {
    if (!currentImage || isPrivateMode || isViewOnly) return;
    const isConfirmed = confirm(
      `確定要刪除成員「${currentStudentName}」的第 ${currentPageIndex + 1} 頁圖片嗎？`
    );
    if (!isConfirmed) return;

    const imgId = currentImage.id;
    if (onDeleteImage) {
      await onDeleteImage(currentBook.id, currentStudentName, imgId);
    }

    // 頁碼平滑切換
    if (images.length > 1) {
      if (currentPageIndex >= images.length - 1) {
        setCurrentPageIndex(images.length - 2);
      }
    } else {
      // 該成員唯一一張圖片已刪除
      if (nextStudentName) {
        setCurrentStudentName(nextStudentName);
        setCurrentPageIndex(0);
      } else if (prevStudentName) {
        setCurrentStudentName(prevStudentName);
        setCurrentPageIndex(0);
      }
    }
  };

  // 刪除指定成員
  const handleDeleteTargetStudent = async (targetName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isPrivateMode || isViewOnly) return;
    const isConfirmed = confirm(`確定要徹底刪除成員「${targetName}」及其所有圖片嗎？`);
    if (!isConfirmed) return;

    if (onDeleteStudent) {
      await onDeleteStudent(currentBook.id, targetName);
    }

    // 若刪除的是當前正在檢視的成員，切換至相鄰成員
    if (targetName === currentStudentName) {
      const remaining = studentNames.filter((n) => n !== targetName);
      if (remaining.length > 0) {
        const nextIdx = studentNames.indexOf(targetName);
        const newTarget = remaining[nextIdx] || remaining[remaining.length - 1];
        setCurrentStudentName(newTarget);
        setCurrentPageIndex(0);
      } else {
        onClose();
      }
    }
  };

  // 目錄搜尋過濾
  const filteredDirectory = studentNames.filter((name) => 
    !directorySearch.trim() || name.toLowerCase().includes(directorySearch.trim().toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden"
      style={{ backgroundColor: '#070B12' }} // 深海軍夜黑 100% 實心遮罩
      onMouseUp={handleMouseUp}
    >
      {/* 頂部極簡沉浸工具列 (深黑藍 + 金) */}
      <div className="h-13 sm:h-14 px-2.5 sm:px-5 flex items-center justify-between text-white border-b border-white/10 bg-[#0B111E] z-30 flex-shrink-0">
        {/* 手機版：左側名單按鈕 */}
        <div className="flex sm:hidden items-center flex-shrink-0">
          {!isPrivateMode && (
            <button
              type="button"
              onClick={() => setShowDirectory(!showDirectory)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                showDirectory
                  ? 'bg-gradient-to-r from-[#F3D17A] to-[#D4AF37] text-[#070B12] shadow-sm'
                  : 'bg-white/5 text-[#E5C07B] hover:bg-[#D4AF37]/15 border border-[#D4AF37]/35'
              }`}
              title="展開全班學生名單"
            >
              <List className="w-3.5 h-3.5" />
              <span>名單 ({studentNames.length})</span>
            </button>
          )}
        </div>

        {/* 手機版：中央完整顯示學生姓名與頁碼 (絕對不被截斷為 李...) */}
        <div className="flex sm:hidden flex-1 items-center justify-center min-w-0 px-2">
          <div className="flex items-center gap-1.5 font-rounded font-bold text-sm sm:text-base text-[#F3D17A] truncate">
            <User className="w-3.5 h-3.5 text-[#E5C07B] flex-shrink-0" />
            <span className="truncate max-w-[120px]">{currentStudentName}</span>
            <span className="text-xs text-[#E5C07B]/80 font-mono flex-shrink-0">
              ({currentPageIndex + 1}/{images.length})
            </span>
          </div>
        </div>

        {/* 桌面版：左側冊子名稱 + 名單按鈕 + 學生姓名膠囊 + 頁碼 */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3 min-w-0">
          {/* 冊子名稱標題 */}
          <div className="hidden lg:flex items-center gap-1.5 text-stone-200 text-xs font-serif font-bold border-r border-white/10 pr-3 mr-1 truncate max-w-[200px]">
            <BookOpen className="w-3.5 h-3.5 text-[#E5C07B] flex-shrink-0" />
            <span className="truncate">{currentBook.title}</span>
          </div>

          {/* 學生總名冊抽屜切換鈕 */}
          {!isPrivateMode && (
            <button
              type="button"
              onClick={() => setShowDirectory(!showDirectory)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                showDirectory
                  ? 'bg-gradient-to-r from-[#F3D17A] to-[#D4AF37] text-[#070B12] shadow-sm'
                  : 'bg-white/5 text-[#E5C07B] hover:bg-[#D4AF37]/15 border border-[#D4AF37]/30'
              }`}
              title="展開全班學生名單與快速跳轉"
            >
              <List className="w-3.5 h-3.5" />
              <span>名單 ({studentNames.length}人)</span>
            </button>
          )}

          {/* 當前學生姓名膠囊：圓體大一號 */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-[#D4AF37]/35 px-3.5 py-1 rounded-full font-rounded font-bold text-base text-[#F3D17A] shadow-2xs truncate">
            <User className="w-4 h-4 text-[#E5C07B] flex-shrink-0" />
            <span className="truncate">{currentStudentName}</span>
            <span className="text-xs text-stone-400 font-mono ml-0.5">
              ({currentStudentIndex + 1}/{studentNames.length})
            </span>
          </div>

          {/* 頁碼指示膠囊：圓體大一號 */}
          <span className="font-rounded font-bold text-sm sm:text-base text-[#E5C07B] bg-white/5 px-3 py-1 rounded-full flex-shrink-0 border border-[#D4AF37]/25">
            {currentPageIndex + 1} / {images.length} 頁
          </span>
        </div>

        {/* 右側快捷動作 */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* 複製整冊協作分享連結 (桌面版顯示) */}
          <button
            type="button"
            onClick={copyBookCollabLink}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-[#070B12] bg-gradient-to-r from-[#F3D17A] via-[#E5C07B] to-[#D4AF37] hover:brightness-110 rounded-full shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            title="複製本冊專屬協作連結"
          >
            {copiedType === 'collab' ? (
              <Check className="w-3.5 h-3.5 text-[#070B12]" />
            ) : (
              <Users className="w-3.5 h-3.5 text-[#070B12]" />
            )}
            <span>{copiedType === 'collab' ? '已複製！' : '分享'}</span>
          </button>

          {/* 順時針旋轉 90° */}
          <button
            type="button"
            onClick={rotate}
            className="p-1.5 sm:p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="旋轉圖片 90° (R)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* 原圖下載 (桌面版顯示) */}
          {currentImage && (
            <a
              href={currentImage.url}
              download={`${currentStudentName}_第${currentPageIndex + 1}頁.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden sm:inline-flex"
              title="下載或原圖查看"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          {/* 刪除此頁圖片按鈕 */}
          {!isPrivateMode && !isViewOnly && currentImage && (
            <button
              type="button"
              onClick={handleDeleteCurrentImage}
              className="p-1.5 sm:p-2 text-stone-400 hover:text-red-400 hover:bg-red-500/15 rounded-full transition-colors cursor-pointer"
              title="刪除此頁圖片"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* 關閉按鈕 */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 ml-0.5 text-stone-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="關閉閱卷 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 主展示區 (包含左側滑出名冊 + 置中大圖) */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* 左側：學生總目錄抽屜面板 (可開關) */}
        {showDirectory && !isPrivateMode && (
          <div className="w-64 sm:w-72 bg-[#18191E] border-r border-white/10 flex flex-col z-40 animate-in slide-in-from-left duration-200 shadow-2xl flex-shrink-0">
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-stone-300" />
                <span>全冊學生目錄</span>
                <span className="text-[10px] text-stone-400 bg-white/10 px-2 py-0.5 rounded-full">
                  {studentNames.length}人
                </span>
              </span>
              <button
                type="button"
                onClick={() => setShowDirectory(false)}
                className="text-stone-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 搜尋學生 */}
            <div className="p-2.5 border-b border-white/10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜尋姓名..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-full text-stone-100 placeholder-stone-500 outline-none focus:border-white/40 font-sans"
                />
              </div>
            </div>

            {/* 學生名單捲軸：圓體大一號、金色字、選中為金底藍字 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredDirectory.map((name, idx) => {
                const sFolder = currentBook.students?.[name];
                const pageCount = sFolder?.images?.length || 0;
                const isSelected = name === currentStudentName;

                return (
                  <div
                    key={name}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-rounded text-sm sm:text-base transition-all group ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#F3D17A] to-[#D4AF37] text-[#070B12] font-black shadow-md'
                        : 'text-[#E5C07B] hover:bg-white/5 hover:text-[#F3D17A]'
                    }`}
                  >
                    <div 
                      onClick={() => {
                        resetTransform();
                        setCurrentStudentName(name);
                        setCurrentPageIndex(0);
                      }}
                      className="flex items-center gap-2.5 truncate flex-1 cursor-pointer"
                    >
                      <span className={`w-5 text-xs font-mono font-bold ${isSelected ? 'text-[#070B12]/80' : 'text-[#D4AF37]/60'}`}>
                        {idx + 1}.
                      </span>
                      <span className="truncate">{name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isSelected ? 'bg-[#070B12]/15 text-[#070B12]' : 'bg-white/5 text-[#E5C07B]/80 border border-[#D4AF37]/20'
                      }`}>
                        {pageCount} 頁
                      </span>

                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTargetStudent(name, e)}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${
                            isSelected 
                              ? 'text-[#070B12]/60 hover:text-red-700 hover:bg-black/10' 
                              : 'text-stone-400 hover:text-red-400 hover:bg-white/10'
                          }`}
                          title={`刪除成員「${name}」及其所有圖片`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 滿版看圖區 (支援滑動翻頁、滾輪縮放、雙擊放大與拖曳移動) */}
        <div 
          ref={imageContainerRef}
          className="flex-1 relative flex items-center justify-center overflow-hidden p-0 sm:p-4 touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {/* 左側翻頁箭頭 (僅桌面版顯示，手機版透過滑動或左右邊緣觸控，避免遮擋成績單內容) */}
          <button
            type="button"
            onClick={goToPrevPage}
            disabled={currentPageIndex === 0 && !prevStudentName}
            className="hidden sm:flex absolute left-4 z-20 w-12 h-12 rounded-full bg-[#0B111E]/90 hover:bg-[#151F32] disabled:opacity-20 disabled:pointer-events-none text-[#E5C07B] items-center justify-center border border-[#D4AF37]/40 shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="上一頁 (左方向鍵)"
          >
            <ChevronLeft className="w-7 h-7 text-[#E5C07B]" />
          </button>

          {/* 手機版左右邊緣隱形觸控區 (點擊左邊緣上一頁，點擊右邊緣下一頁，零遮擋) */}
          <div 
            onClick={goToPrevPage}
            className="sm:hidden absolute left-0 top-0 bottom-0 w-14 z-10 cursor-pointer active:bg-white/5 transition-colors"
            title="輕觸上一頁"
          />
          <div 
            onClick={goToNextPage}
            className="sm:hidden absolute right-0 top-0 bottom-0 w-14 z-10 cursor-pointer active:bg-white/5 transition-colors"
            title="輕觸下一頁"
          />

          {/* 考卷圖片主體 */}
          {currentImage ? (
            <div
              className="transition-transform duration-75 ease-out max-w-full max-h-full flex items-center justify-center select-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              }}
            >
              <img
                src={currentImage.url}
                alt={`${currentStudentName} 成績考卷截圖`}
                className="max-h-[calc(100vh-125px)] w-full sm:w-auto max-w-full sm:max-w-[calc(100vw-80px)] object-contain shadow-2xl rounded-none sm:rounded-lg pointer-events-none filter drop-shadow-md select-none"
                onDoubleClick={() => {
                  if (scale === 1) {
                    setScale(2.4);
                  } else {
                    resetTransform();
                  }
                }}
              />
            </div>
          ) : (
            <div className="text-stone-400 text-sm">此學生尚無成績截圖</div>
          )}

          {/* 右側翻頁箭頭 (僅桌面版顯示) */}
          <button
            type="button"
            onClick={goToNextPage}
            disabled={currentPageIndex >= images.length - 1 && !nextStudentName}
            className="hidden sm:flex absolute right-4 z-20 w-12 h-12 rounded-full bg-[#0B111E]/90 hover:bg-[#151F32] disabled:opacity-20 disabled:pointer-events-none text-[#E5C07B] items-center justify-center border border-[#D4AF37]/40 shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="下一頁 (右方向鍵)"
          >
            <ChevronRight className="w-7 h-7 text-[#E5C07B]" />
          </button>
        </div>
      </div>

      {/* 底部功能 Dock (黑藍 + 金，手機版高度精簡自適應) */}
      <div className="bg-[#0B111E] border-t border-white/10 px-2 sm:px-6 py-1.5 sm:py-2.5 flex flex-col gap-1.5 z-30 flex-shrink-0">
        {/* 多頁指示器小圓點 */}
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
                className={`transition-all rounded-full cursor-pointer ${
                  currentPageIndex === idx
                    ? 'w-5 h-1.5 bg-[#E5C07B] shadow-sm shadow-[#D4AF37]/50'
                    : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/50'
                }`}
                title={`第 ${idx + 1} 頁`}
              />
            ))}
          </div>
        )}

        {/* 底部導覽：切換學生專屬按鈕列 */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 max-w-2xl mx-auto w-full">
          {/* 上一位學生：稍粗圓體 */}
          {!isPrivateMode && (
            <button
              type="button"
              disabled={!prevStudentName}
              onClick={goToPrevStudent}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 font-rounded font-bold text-xs sm:text-base text-[#E5C07B] bg-[#151F32] hover:bg-[#1C2942] disabled:opacity-30 disabled:pointer-events-none rounded-xl border border-[#D4AF37]/35 shadow-sm active:scale-95 transition-all truncate cursor-pointer h-10 sm:h-auto"
            >
              <ChevronLeft className="w-4 h-4 text-[#E5C07B] flex-shrink-0" />
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
                className={`h-9 w-12 rounded-md overflow-hidden flex-shrink-0 border transition-all cursor-pointer ${
                  currentPageIndex === idx
                    ? 'border-[#E5C07B] scale-105 ring-2 ring-[#E5C07B]/80'
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

          {/* 下一位學生：稍粗圓體 */}
          {!isPrivateMode && (
            <button
              type="button"
              disabled={!nextStudentName}
              onClick={goToNextStudent}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 font-rounded font-black text-xs sm:text-base text-[#070B12] bg-gradient-to-r from-[#F3D17A] via-[#E5C07B] to-[#D4AF37] hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none rounded-xl shadow-lg shadow-[#D4AF37]/20 active:scale-95 transition-all truncate cursor-pointer h-10 sm:h-auto"
            >
              <span className="truncate">{nextStudentName ? `下一位：${nextStudentName}` : '已是最後一位'}</span>
              <ChevronRight className="w-4 h-4 text-[#070B12] flex-shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
