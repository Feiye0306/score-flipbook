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
  FileText
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

  // 目錄搜尋過濾
  const filteredDirectory = studentNames.filter((name) => 
    !directorySearch.trim() || name.toLowerCase().includes(directorySearch.trim().toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col select-none overflow-hidden"
      style={{ backgroundColor: '#0E141B' }} // 深海軍藍黑 100% 實心遮罩，沉浸專注
      onMouseUp={handleMouseUp}
    >
      {/* 頂部極簡沉浸工具列 */}
      <div className="h-14 px-3 sm:px-5 flex items-center justify-between text-white border-b border-white/10 bg-[#16202A] z-30 flex-shrink-0">
        {/* 左側：冊子名稱 + 學生目錄展開鈕 + 當前學生資訊 */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* 冊子名稱標題 */}
          <div className="hidden lg:flex items-center gap-1.5 text-stone-200 text-xs font-serif font-bold border-r border-white/10 pr-3 mr-1 truncate max-w-[200px]">
            <BookOpen className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span className="truncate">{currentBook.title}</span>
          </div>

          {/* 學生總名冊抽屜切換鈕 */}
          {!isPrivateMode && (
            <button
              type="button"
              onClick={() => setShowDirectory(!showDirectory)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                showDirectory
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'bg-white/10 text-stone-200 hover:bg-white/20 hover:text-white border border-white/15'
              }`}
              title="展開全班學生名單與快速跳轉"
            >
              <List className="w-3.5 h-3.5" />
              <span>名單 ({studentNames.length}人)</span>
            </button>
          )}

          {/* 當前學生姓名膠囊 */}
          <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1 rounded-full text-xs font-bold text-white shadow-2xs truncate">
            <User className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
            <span className="truncate max-w-[90px] sm:max-w-none">{currentStudentName}</span>
            <span className="text-[10px] text-stone-400 font-mono hidden sm:inline">
              ({currentStudentIndex + 1}/{studentNames.length})
            </span>
          </div>

          {/* 頁碼指示膠囊 */}
          <span className="text-xs text-stone-200 font-medium bg-white/10 px-2.5 py-0.5 rounded-full flex-shrink-0 border border-white/10">
            {currentPageIndex + 1} / {images.length} 頁
          </span>
        </div>

        {/* 右側快捷動作 */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* 複製整冊協作分享連結 (他人可看可上傳) */}
          <button
            type="button"
            onClick={copyBookCollabLink}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-[#111111] bg-white hover:bg-stone-200 rounded-full shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            title="複製本冊專屬協作連結（他人點開可看圖、可上傳考卷）"
          >
            {copiedType === 'collab' ? (
              <Check className="w-3.5 h-3.5 text-[#111111]" />
            ) : (
              <Users className="w-3.5 h-3.5 text-[#111111]" />
            )}
            <span className="hidden sm:inline">{copiedType === 'collab' ? '已複製協作連結！' : '分享本冊協作'}</span>
            <span className="sm:hidden">{copiedType === 'collab' ? '已複製' : '分享'}</span>
          </button>

          {/* 順時針旋轉 90° */}
          <button
            type="button"
            onClick={rotate}
            className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
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
              className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden sm:inline-flex"
              title="下載或原圖查看"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          {/* 關閉按鈕 */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 ml-1 text-stone-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
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
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-full text-stone-100 placeholder-stone-500 outline-none focus:border-white/40"
                />
              </div>
            </div>

            {/* 學生名單捲軸 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredDirectory.map((name, idx) => {
                const sFolder = currentBook.students?.[name];
                const pageCount = sFolder?.images?.length || 0;
                const isSelected = name === currentStudentName;

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      resetTransform();
                      setCurrentStudentName(name);
                      setCurrentPageIndex(0);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-white text-[#111111] font-bold shadow-sm'
                        : 'text-stone-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-5 text-[11px] font-mono ${isSelected ? 'text-stone-800' : 'text-stone-500'}`}>
                        {idx + 1}.
                      </span>
                      <span className="truncate">{name}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-stone-200 text-stone-900 font-bold' : 'bg-white/10 text-stone-400'
                    }`}>
                      {pageCount} 頁
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 滿版看圖區 */}
        <div 
          className="flex-1 relative flex items-center justify-center overflow-hidden p-2 sm:p-4"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {/* 左側翻頁箭頭 (上一頁) */}
          <button
            type="button"
            onClick={goToPrevPage}
            disabled={currentPageIndex === 0 && !prevStudentName}
            className="absolute left-2 sm:left-4 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#16202A]/85 hover:bg-[#202E3D] disabled:opacity-20 disabled:pointer-events-none text-white flex items-center justify-center border border-white/15 shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="上一頁 (左方向鍵)"
          >
            <ChevronLeft className="w-7 h-7 text-[#D8CEBC]" />
          </button>

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
                className="max-h-[calc(100vh-140px)] max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-80px)] object-contain shadow-2xl rounded-lg pointer-events-none filter drop-shadow-md"
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
            <div className="text-stone-400 text-sm">此學生尚無成績截圖</div>
          )}

          {/* 右側翻頁箭頭 (下一頁) */}
          <button
            type="button"
            onClick={goToNextPage}
            disabled={currentPageIndex >= images.length - 1 && !nextStudentName}
            className="absolute right-2 sm:right-4 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#16202A]/85 hover:bg-[#202E3D] disabled:opacity-20 disabled:pointer-events-none text-white flex items-center justify-center border border-white/15 shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="下一頁 (右方向鍵)"
          >
            <ChevronRight className="w-7 h-7 text-[#D8CEBC]" />
          </button>
        </div>
      </div>

      {/* 底部功能 Dock */}
      <div className="bg-[#16202A] border-t border-white/10 px-3 sm:px-6 py-2.5 flex flex-col gap-2 z-30 flex-shrink-0">
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
                    ? 'w-5 h-1.5 bg-[#D8CEBC]'
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
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#D8CEBC] bg-[#1E293B]/90 hover:bg-[#2A374A] disabled:opacity-30 disabled:pointer-events-none rounded-xl border border-white/10 shadow-sm active:scale-95 transition-all truncate cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-[#D8CEBC] flex-shrink-0" />
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
                    ? 'border-[#D8CEBC] scale-105 ring-1 ring-[#D8CEBC]'
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
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#16202A] bg-[#D8CEBC] hover:bg-[#C9BCA6] disabled:opacity-30 disabled:pointer-events-none rounded-xl shadow-md active:scale-95 transition-all truncate cursor-pointer"
            >
              <span className="truncate">{nextStudentName ? `下一位：${nextStudentName}` : '已是最後一位'}</span>
              <ChevronRight className="w-4 h-4 text-[#16202A] flex-shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
