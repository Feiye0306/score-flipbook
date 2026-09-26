import React from 'react';
import { User, BookOpen, Images, ArrowLeft, Download } from 'lucide-react';
import type { ExamBook } from '../types';
import { FlipViewerModal } from './FlipViewerModal';

interface StudentPrivateViewProps {
  currentBook: ExamBook;
  studentName: string;
  onExitPrivateMode: () => void;
}

export const StudentPrivateView: React.FC<StudentPrivateViewProps> = ({
  currentBook,
  studentName,
  onExitPrivateMode,
}) => {
  const studentFolder = currentBook.students?.[studentName];

  if (!studentFolder) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 text-center shadow-lg border border-slate-200">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">查無此學生成績資料</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            在冊子「{currentBook.title}」中未找到學生「{studentName}」的成績圖片。
          </p>
          <button
            type="button"
            onClick={onExitPrivateMode}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
          >
            返回冊子總覽
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* 獨立頂部欄 */}
      <header className="h-16 px-4 sm:px-8 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExitPrivateMode}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="查看完整冊子"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              <span>{studentName} 的成績單考卷</span>
            </h1>
            <p className="text-xs text-slate-400">
              {currentBook.title} · 共 {studentFolder.images.length} 頁
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onExitPrivateMode}
          className="text-xs text-indigo-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          切換全冊
        </button>
      </header>

      {/* 嵌入全螢幕大圖翻閱器 */}
      <div className="flex-1 relative">
        <FlipViewerModal
          currentBook={currentBook}
          initialStudentName={studentName}
          initialPageIndex={0}
          isOpen={true}
          onClose={() => {}}
          isPrivateMode={true}
        />
      </div>
    </div>
  );
};
