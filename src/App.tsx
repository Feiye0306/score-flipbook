import React, { useState, useEffect } from 'react';
import { 
  subscribeBooks, 
  saveExamBook, 
  deleteExamBook, 
  removeStudentFolder,
  getLocalBooks
} from './services/dbService';
import type { ExamBook } from './types';
import { Navbar } from './components/Navbar';
import { BookshelfView } from './components/BookshelfView';
import { StudentCardList } from './components/StudentCardList';
import { UploadModal } from './components/UploadModal';
import { FlipViewerModal } from './components/FlipViewerModal';
import { StudentPrivateView } from './components/StudentPrivateView';
import { ShareModal } from './components/ShareModal';
import { BookOpen, Sparkles, UploadCloud, Layers, Users, ArrowLeft } from 'lucide-react';

export const App: React.FC = () => {
  const [books, setBooks] = useState<ExamBook[]>([]);
  const [currentBookId, setCurrentBookId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 視圖標籤：'shelf' (書架總覽) vs 'book' (單冊名單)
  const [activeTab, setActiveTab] = useState<'shelf' | 'book'>('shelf');

  // 彈窗與模式控制
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalBook, setShareModalBook] = useState<ExamBook | null>(null);
  const [viewerStudent, setViewerStudent] = useState<string | null>(null);
  const [viewerPageIndex, setViewerPageIndex] = useState(0);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isSingleBookMode, setIsSingleBookMode] = useState(false);

  // URL 參數 (判斷是否為個別學生私密專屬連結或唯讀模式)
  const [urlStudent, setUrlStudent] = useState<string | null>(null);

  // 初始化監聽冊子
  useEffect(() => {
    // 讀取 URL 參數
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share') || params.get('book');
    const studentParam = params.get('student');
    const modeParam = params.get('mode');

    if (studentParam) setUrlStudent(studentParam);
    if (modeParam === 'view') setIsViewOnly(true);
    if (shareParam) {
      setIsSingleBookMode(true);
      setActiveTab('book'); // 訪客從特定分享連結進入直接看該冊
    }

    const unsubscribe = subscribeBooks((loadedBooks) => {
      // 確保每本冊子都有 shareCode
      const normalizedBooks = loadedBooks.map((b) => ({
        ...b,
        shareCode: b.shareCode || b.id,
      }));

      setBooks(normalizedBooks);

      if (normalizedBooks.length > 0) {
        if (shareParam) {
          const matched = normalizedBooks.find(
            (b) => b.shareCode === shareParam || b.id === shareParam
          );
          if (matched) {
            setCurrentBookId(matched.id);
          } else {
            // 訪客透過隨機新連結進入，為其建立此專屬冊子
            const sharedNewBook: ExamBook = {
              id: 'exam_' + Date.now(),
              title: '分享的測驗成績冊',
              shareCode: shareParam,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              students: {},
            };
            saveExamBook(sharedNewBook);
            setBooks((prev) => [sharedNewBook, ...prev]);
            setCurrentBookId(sharedNewBook.id);
          }
        } else {
          setCurrentBookId((prev) => (prev ? prev : normalizedBooks[0].id));
        }
      } else {
        // 初次若無任何冊子，自動建立預設第一本
        const defaultBook: ExamBook = {
          id: 'exam_' + Date.now(),
          title: '第一次段考 - 數學科',
          shareCode: 'bk_' + Math.random().toString(36).substring(2, 8),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          students: {},
        };
        saveExamBook(defaultBook);
        setBooks([defaultBook]);
        setCurrentBookId(defaultBook.id);
      }
    });

    return () => unsubscribe();
  }, []);

  // 當前選取的冊子
  const currentBook = books.find((b) => b.id === currentBookId) || books[0] || null;

  // 點擊冊子封面：直接開卷翻閱！
  const handleOpenViewerForBook = (book: ExamBook) => {
    setCurrentBookId(book.id);
    const studentNames = Object.keys(book.students || {}).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    if (studentNames.length > 0) {
      setViewerStudent(studentNames[0]);
      setViewerPageIndex(0);
    } else {
      // 該冊尚無考卷，切換至該冊並提示上傳
      setActiveTab('book');
      setIsUploadOpen(true);
    }
  };

  // 建立新冊子 (樂觀立即更新，含專屬隨機分享碼)
  const handleCreateBook = async (title: string) => {
    const randomShareCode = 'bk_' + Math.random().toString(36).substring(2, 8);
    const newBook: ExamBook = {
      id: 'exam_' + Date.now(),
      title,
      shareCode: randomShareCode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      students: {},
    };
    setBooks((prev) => [newBook, ...prev.filter((b) => b.id !== newBook.id)]);
    setCurrentBookId(newBook.id);
    setActiveTab('book');
    await saveExamBook(newBook);
  };

  // 刪除冊子
  const handleDeleteBook = async (bookId: string) => {
    await deleteExamBook(bookId);
    setBooks((prev) => {
      const remaining = prev.filter((b) => b.id !== bookId);
      if (remaining.length > 0) {
        setCurrentBookId(remaining[0].id);
      }
      return remaining;
    });
  };

  // 刪除學生 (樂觀立即更新)
  const handleDeleteStudent = async (studentName: string) => {
    if (!currentBook) return;
    await removeStudentFolder(currentBook.id, studentName);
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== currentBook.id) return b;
        const newStudents = { ...b.students };
        delete newStudents[studentName];
        return { ...b, students: newStudents, updatedAt: Date.now() };
      })
    );
  };

  // 上傳成功後的即時同步回調
  const handleUploadComplete = () => {
    const local = getLocalBooks();
    const updatedBooks = Object.values(local).sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
    );
    if (updatedBooks.length > 0) {
      setBooks(updatedBooks);
    }
    setIsUploadOpen(false);
  };

  // 如果帶有 ?student=王小明，進入個人專屬模式
  if (urlStudent && currentBook) {
    return (
      <StudentPrivateView
        currentBook={currentBook}
        studentName={urlStudent}
        onExitPrivateMode={() => {
          setUrlStudent(null);
          const url = new URL(window.location.href);
          url.searchParams.delete('student');
          window.history.replaceState({}, '', url.toString());
        }}
      />
    );
  }

  const studentCount = currentBook ? Object.keys(currentBook.students || {}).length : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA] text-stone-800 antialiased selection:bg-amber-100 selection:text-amber-900">
      {/* 頂部導覽列 */}
      <Navbar
        books={books}
        currentBook={currentBook}
        onSelectBook={(id) => {
          setCurrentBookId(id);
          setActiveTab('book');
        }}
        onCreateBook={handleCreateBook}
        onDeleteBook={handleDeleteBook}
        onBookRestored={(restored) => {
          setCurrentBookId(restored.id);
          setActiveTab('book');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenShare={() => {
          setShareModalBook(currentBook);
          setIsShareModalOpen(true);
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isViewOnly={isViewOnly}
        isSingleBookMode={isSingleBookMode}
      />

      {/* 主要內容區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        {books.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500">正在載入雲端測驗冊子...</p>
          </div>
        ) : activeTab === 'shelf' ? (
          /* 【書架視圖模式】：冊子排列陳列，點擊直接開卷看圖與翻頁 */
          <BookshelfView
            books={books}
            currentBookId={currentBookId}
            onSelectBook={(id) => {
              setCurrentBookId(id);
              setActiveTab('book');
            }}
            onOpenViewerForBook={handleOpenViewerForBook}
            onOpenShareModal={(book) => {
              setShareModalBook(book);
              setIsShareModalOpen(true);
            }}
            onCreateBookClick={() => {
              const title = prompt('請輸入新冊子名稱（例如：113第一次段考數學）：');
              if (title && title.trim()) {
                handleCreateBook(title.trim());
              }
            }}
            onDeleteBook={handleDeleteBook}
            isViewOnly={isViewOnly}
          />
        ) : currentBook ? (
          /* 【單冊名單管理模式】：溫潤紙質風格看板 + 學生卡片清單 */
          <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-150">
            {/* 冊子資訊看板 (溫潤紙質風取代原本刺眼的紫色 Banner) */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('shelf')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>返回冊子書架</span>
                  </button>
                  <span className="text-stone-300">·</span>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded">
                    測驗冊
                  </span>
                  {currentBook.shareCode && (
                    <span className="text-[10px] font-mono text-stone-400">
                      #{currentBook.shareCode}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif tracking-tight">
                  {currentBook.title}
                </h2>
                <p className="text-xs text-stone-500">
                  共收錄 {studentCount} 位學生考卷。點選卡片或點右側「開始翻閱」依序閱卷。
                </p>
              </div>

              {/* 橫幅主要動作區 */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1 lg:pt-0">
                {/* 核心功能：直接開始整冊翻閱 */}
                <button
                  type="button"
                  onClick={() => handleOpenViewerForBook(currentBook)}
                  disabled={studentCount === 0}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:pointer-events-none rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  title="從第 1 位學生開始全螢幕依序翻閱整冊考卷"
                >
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>📖 開始翻閱全冊</span>
                </button>

                {/* 分享本冊協作 */}
                <button
                  type="button"
                  onClick={() => {
                    setShareModalBook(currentBook);
                    setIsShareModalOpen(true);
                  }}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  title="產生本冊專屬連結，發給他人一起看圖與上傳"
                >
                  <Users className="w-4 h-4 text-amber-700" />
                  <span>👥 分享本冊協作</span>
                </button>

                {/* 上傳成績圖 */}
                {!isViewOnly && (
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(true)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <UploadCloud className="w-4 h-4 text-stone-600" />
                    <span>上傳成績截圖</span>
                  </button>
                )}
              </div>
            </div>

            {/* 學生卡片清單 */}
            <StudentCardList
              currentBook={currentBook}
              searchQuery={searchQuery}
              onOpenViewer={(name, page) => {
                setViewerStudent(name);
                setViewerPageIndex(page || 0);
              }}
              onOpenUploadForStudent={(name) => {
                setIsUploadOpen(true);
              }}
              onDeleteStudent={handleDeleteStudent}
              onOpenUpload={() => setIsUploadOpen(true)}
              isViewOnly={isViewOnly}
            />
          </div>
        ) : null}
      </main>

      {/* 冊子專屬分享視窗 (協作/唯讀) */}
      {shareModalBook && (
        <ShareModal
          currentBook={shareModalBook}
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setShareModalBook(null);
          }}
        />
      )}

      {/* 上傳彈窗 */}
      {currentBook && (
        <UploadModal
          currentBook={currentBook}
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* 大圖翻閱器燈箱 */}
      {currentBook && viewerStudent && (
        <FlipViewerModal
          currentBook={currentBook}
          initialStudentName={viewerStudent}
          initialPageIndex={viewerPageIndex}
          isOpen={!!viewerStudent}
          onClose={() => setViewerStudent(null)}
        />
      )}
    </div>
  );
};
