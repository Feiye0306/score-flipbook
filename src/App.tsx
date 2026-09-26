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
import { StudentCardList } from './components/StudentCardList';
import { UploadModal } from './components/UploadModal';
import { FlipViewerModal } from './components/FlipViewerModal';
import { StudentPrivateView } from './components/StudentPrivateView';
import { BookOpen, Sparkles, UploadCloud, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [books, setBooks] = useState<ExamBook[]>([]);
  const [currentBookId, setCurrentBookId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 彈窗與模式控制
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewerStudent, setViewerStudent] = useState<string | null>(null);
  const [viewerPageIndex, setViewerPageIndex] = useState(0);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // URL 參數 (判斷是否為個別學生私密專屬連結或唯讀模式)
  const [urlStudent, setUrlStudent] = useState<string | null>(null);

  // 初始化監聽冊子
  useEffect(() => {
    // 讀取 URL 參數
    const params = new URLSearchParams(window.location.search);
    const bookParam = params.get('book');
    const studentParam = params.get('student');
    const modeParam = params.get('mode');

    if (studentParam) setUrlStudent(studentParam);
    if (modeParam === 'view') setIsViewOnly(true);

    const unsubscribe = subscribeBooks((loadedBooks) => {
      setBooks(loadedBooks);

      if (loadedBooks.length > 0) {
        // 若 URL 指定了冊子，優先使用
        if (bookParam && loadedBooks.some((b) => b.id === bookParam)) {
          setCurrentBookId(bookParam);
        } else {
          // 預設選取最新一本
          setCurrentBookId((prev) => (prev ? prev : loadedBooks[0].id));
        }
      } else {
        // 初次若無任何冊子，自動建立預設第一本
        const defaultBook: ExamBook = {
          id: 'exam_' + Date.now(),
          title: '第一次段考 - 數學科',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          students: {},
        };
        saveExamBook(defaultBook);
        setCurrentBookId(defaultBook.id);
      }
    });

    return () => unsubscribe();
  }, []);

  // 當前選取的冊子
  const currentBook = books.find((b) => b.id === currentBookId) || books[0] || null;

  // 建立新冊子 (樂觀立即更新)
  const handleCreateBook = async (title: string) => {
    const newBook: ExamBook = {
      id: 'exam_' + Date.now(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      students: {},
    };
    // 立即更新前端 state
    setBooks((prev) => [newBook, ...prev.filter((b) => b.id !== newBook.id)]);
    setCurrentBookId(newBook.id);
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
    // 重新取得最新本機/雲端資料
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
          // 清除 URL 參數
          const url = new URL(window.location.href);
          url.searchParams.delete('student');
          window.history.replaceState({}, '', url.toString());
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* 頂部導覽列 */}
      <Navbar
        books={books}
        currentBook={currentBook}
        onSelectBook={(id) => setCurrentBookId(id)}
        onCreateBook={handleCreateBook}
        onDeleteBook={handleDeleteBook}
        onBookRestored={(restored) => setCurrentBookId(restored.id)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenUpload={() => setIsUploadOpen(true)}
        isViewOnly={isViewOnly}
      />

      {/* 主要內容區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentBook ? (
          <div className="space-y-6">
            {/* 冊子資訊看板 */}
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
                  <Layers className="w-4 h-4" />
                  當前測驗冊子
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {currentBook.title}
                </h2>
                <p className="text-xs text-indigo-100/90 max-w-xl">
                  已收錄 {Object.keys(currentBook.students || {}).length} 位學生考卷與截圖。點擊任意卡片可翻頁、縮放檢視批改紅筆細節。
                </p>
              </div>

              {!isViewOnly && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    <span>上傳本冊成績截圖</span>
                  </button>
                </div>
              )}
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
        ) : (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">正在載入雲端測驗冊子...</p>
          </div>
        )}
      </main>

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
