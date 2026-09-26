import React, { useState, useEffect } from 'react';
import { 
  subscribeBooks, 
  saveExamBook, 
  deleteExamBook, 
  removeStudentFolder,
  getLocalBooks,
  subscribeSingleBook,
  fetchSingleBook
} from './services/dbService';
import { verifyAccessToken } from './services/tokenService';
import type { ExamBook } from './types';
import { Navbar } from './components/Navbar';
import { BookshelfView, getBookTheme } from './components/BookshelfView';
import { StudentCardList } from './components/StudentCardList';
import { UploadModal } from './components/UploadModal';
import { FlipViewerModal } from './components/FlipViewerModal';
import { StudentPrivateView } from './components/StudentPrivateView';
import { ShareModal } from './components/ShareModal';
import { FirebaseGuideModal } from './components/FirebaseGuideModal';
import { BookOpen, UploadCloud, Users, ArrowLeft, Download, Loader2, ShieldCheck, ShieldAlert, Calendar, ArrowRight } from 'lucide-react';
import { downloadBookImages } from './utils/zipExporter';

export const App: React.FC = () => {
  const [books, setBooks] = useState<ExamBook[]>([]);
  const [currentBookId, setCurrentBookId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloadingBook, setIsDownloadingBook] = useState(false);
  const [downloadProgressText, setDownloadProgressText] = useState('');
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  // 視圖標籤：'shelf' (書架總覽) vs 'book' (單冊名單)
  const [activeTab, setActiveTab] = useState<'shelf' | 'book'>('shelf');

  // 彈窗與模式控制
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalBook, setShareModalBook] = useState<ExamBook | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
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
    const tokenParam = params.get('token');
    const shareParam = params.get('share') || params.get('book');
    const studentParam = params.get('student');
    const modeParam = params.get('mode');

    if (studentParam) setUrlStudent(studentParam);
    if (modeParam === 'view') setIsViewOnly(true);

    // 🛡️ 雙層鑑權模式：網址帶有去特化隨機 Token
    if (tokenParam) {
      setIsVerifyingToken(true);
      setIsSingleBookMode(true);
      setActiveTab('book');

      verifyAccessToken(tokenParam).then(async (grant) => {
        setIsVerifyingToken(false);
        if (!grant) {
          setTokenError('此安全分享憑證無效、過期或已被作者撤銷，基於資訊安全無法開啟此冊。');
          return;
        }

        if (grant.role === 'view') {
          setIsViewOnly(true);
        }

        setCurrentBookId(grant.bookId);

        // 僅單點載入被授權的該冊，絕不請求全庫
        const loadedBook = await fetchSingleBook(grant.bookId);
        if (loadedBook) {
          setBooks([loadedBook]);
        }

        // 精確單點即時監聽該冊
        subscribeSingleBook(grant.bookId, (updatedBook) => {
          setBooks((prev) => [updatedBook, ...prev.filter((b) => b.id !== updatedBook.id)]);
        });
      });
      return;
    }

    if (shareParam) {
      setIsSingleBookMode(true);
      setActiveTab('book'); // 訪客從特定分享連結進入直接看該冊
    }

    const unsubscribe = subscribeBooks((loadedBooks) => {
      // 1. 自動檢測並清理歷史殘留的「第一次段考」幽靈空冊子
      const validBooks = loadedBooks.filter((b) => {
        const isGhost =
          (b.title.includes('第一次段考') || b.title.includes('數學科') || b.title.includes('專案第一輯')) &&
          Object.keys(b.students || {}).length === 0;
        if (isGhost) {
          deleteExamBook(b.id);
          return false;
        }
        return true;
      });

      // 確保每本冊子都有 shareCode
      const normalizedBooks = validBooks.map((b) => ({
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
          }
        } else {
          setCurrentBookId((prev) => (prev && normalizedBooks.some((b) => b.id === prev) ? prev : normalizedBooks[0].id));
        }
      } else {
        // 沒有冊子時保持乾淨空狀態，絕不擅自建立任何假冊子
        setCurrentBookId('');
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

  // Token 鑑權查核中畫面
  if (isVerifyingToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBFA] p-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-700 shadow-sm animate-pulse">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-stone-900 font-serif mb-2">
          正在核對雙層雲端安全授權憑證...
        </h2>
        <p className="text-xs text-stone-500 max-w-sm leading-relaxed">
          系統正在確認您所持有的密碼學 Access Token 是否合法，並隔離保護其他冊子資料。請稍候數秒...
        </p>
      </div>
    );
  }

  // Token 驗證失敗畫面
  if (tokenError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBFA] p-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-700 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-stone-900 font-serif mb-2">
          存取受限：安全憑證無效或已撤銷
        </h2>
        <p className="text-xs text-stone-500 max-w-sm leading-relaxed mb-6">
          {tokenError}
        </p>
        <button
          type="button"
          onClick={() => {
            setTokenError(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.location.href = url.pathname;
          }}
          className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
        >
          返回首頁
        </button>
      </div>
    );
  }

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
        onOpenCloudGuide={() => setIsGuideOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isViewOnly={isViewOnly}
        isSingleBookMode={isSingleBookMode}
      />

      {/* 主要內容區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7">
        {activeTab === 'shelf' ? (
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
              const title = prompt('請輸入新冊子名稱（例如：活動照片集、圖文翻閱冊）：');
              if (title && title.trim()) {
                handleCreateBook(title.trim());
              }
            }}
            onDeleteBook={handleDeleteBook}
            isViewOnly={isViewOnly}
          />
        ) : currentBook ? (
          /* 【單冊名單管理模式】：Murmurs 雜誌高級感看板 + 學生卡片清單 */
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
            {/* 冊子資訊看板 (大氣排版、超大標題、呼吸留白) */}
            <div className="bg-[#EBF2F8] rounded-3xl border border-[#D6E1EA] p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                {/* 頂部精緻麵包屑導航 */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('shelf')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-[#16202A] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>返回冊子書架</span>
                  </button>
                  <span className="text-stone-300">/</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white bg-[#8A5638] shadow-2xs">
                    圖文冊
                  </span>
                </div>

                {/* 當前頁面的名字：超大、突出、深海軍藍黑優雅襯線字體 */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-[#16202A] tracking-tight leading-tight">
                  {currentBook.title}
                </h1>

                {/* 元數據統計與修訂時間 */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-stone-600 pt-1 font-medium">
                  <span className="font-semibold text-[#16202A]">
                    名單 {studentCount} 人 · 共 {Object.values(currentBook.students || {}).reduce((acc, s) => acc + (s.images?.length || 0), 0)} 張圖
                  </span>
                  {currentBook.updatedAt && (
                    <>
                      <span className="text-stone-300">·</span>
                      <span className="text-stone-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>最後修訂：{new Date(currentBook.updatedAt).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })} {new Date(currentBook.updatedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* 橫幅主要動作區：深海軍黑膠囊按鈕與細線輪廓按鈕 */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
                {studentCount > 0 ? (
                  <>
                    {/* 主翻閱按鈕：深海軍黑圓角膠囊 */}
                    <button
                      type="button"
                      onClick={() => handleOpenViewerForBook(currentBook)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 text-xs sm:text-sm font-bold text-white bg-[#16202A] hover:bg-[#233140] rounded-full shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                      title="從第 1 位成員開始全螢幕依序翻閱"
                    >
                      <BookOpen className="w-4 h-4 text-white" />
                      <span>開始翻閱全冊 ({studentCount}人)</span>
                      <ArrowRight className="w-4 h-4 text-white/70" />
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* 整冊打包下載按鈕：精緻細線白底膠囊 */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (isDownloadingBook) return;
                          setIsDownloadingBook(true);
                          setDownloadProgressText('準備打包...');
                          try {
                            await downloadBookImages(currentBook, (p) => setDownloadProgressText(p));
                          } catch (err) {
                            console.error('打包下載失敗', err);
                            alert('打包下載失敗，請稍後再試');
                          } finally {
                            setIsDownloadingBook(false);
                            setDownloadProgressText('');
                          }
                        }}
                        disabled={isDownloadingBook}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#16202A] bg-white hover:bg-stone-50 border border-[#D6E1EA] hover:border-[#16202A] rounded-full shadow-2xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                        title="打包下載本冊所有圖片為 Zip 壓縮檔 (依成員自動分類資料夾)"
                      >
                        {isDownloadingBook ? (
                          <>
                            <Loader2 className="w-4 h-4 text-stone-700 animate-spin" />
                            <span>{downloadProgressText || '打包中...'}</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 text-stone-600" />
                            <span>整冊打包</span>
                          </>
                        )}
                      </button>

                      {/* 分享協作按鈕 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShareModalBook(currentBook);
                          setIsShareModalOpen(true);
                        }}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#16202A] bg-white hover:bg-stone-50 border border-[#D6E1EA] hover:border-[#16202A] rounded-full shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                        title="產生本冊專屬連結，發給他人一起看圖與上傳"
                      >
                        <Users className="w-4 h-4 text-stone-700" />
                        <span>分享協作</span>
                      </button>

                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={() => setIsUploadOpen(true)}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#16202A] bg-white hover:bg-stone-50 border border-[#D6E1EA] hover:border-[#16202A] rounded-full shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                        >
                          <UploadCloud className="w-4 h-4 text-stone-700" />
                          <span>＋ 上傳</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* 0 人時：手機/電腦上直接展現直覺易懂的上傳按鈕，不顯示灰色的翻閱按鈕 */
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsUploadOpen(true)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#8A5638] hover:bg-[#73452B] rounded-full shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <UploadCloud className="w-4 h-4 text-white" />
                      <span>＋ 立即上傳圖片</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShareModalBook(currentBook);
                        setIsShareModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#16202A] bg-white hover:bg-stone-50 border border-[#D6E1EA] hover:border-[#16202A] rounded-full shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Users className="w-4 h-4 text-[#16202A]" />
                      <span>分享本冊</span>
                    </button>
                  </div>
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

      {/* 雲端同步與權限開通指南彈窗 */}
      <FirebaseGuideModal
        currentBook={currentBook}
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* 上傳彈窗 */}
      {currentBook && (
        <UploadModal
          currentBook={currentBook}
          books={books}
          onSelectBook={(id) => setCurrentBookId(id)}
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
