import React, { useState } from 'react';
import { 
  User, 
  Images, 
  Share2, 
  Trash2, 
  Plus, 
  Check, 
  Eye, 
  UploadCloud,
  ChevronRight
} from 'lucide-react';
import type { ExamBook, StudentFolder } from '../types';

interface StudentCardListProps {
  currentBook: ExamBook;
  searchQuery: string;
  onOpenViewer: (studentName: string, pageIndex?: number) => void;
  onOpenUploadForStudent: (studentName: string) => void;
  onDeleteStudent: (studentName: string) => void;
  onOpenUpload: () => void;
  isViewOnly?: boolean;
}

export const StudentCardList: React.FC<StudentCardListProps> = ({
  currentBook,
  searchQuery,
  onOpenViewer,
  onOpenUploadForStudent,
  onDeleteStudent,
  onOpenUpload,
  isViewOnly = false,
}) => {
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const students = Object.values(currentBook.students || {});
  
  // 搜尋過濾
  const filteredStudents = students.filter((s) =>
    s.studentName.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // 排序：依學生姓名筆畫或名字
  filteredStudents.sort((a, b) => a.studentName.localeCompare(b.studentName, 'zh-Hant'));

  // 複製單一學生個人專屬分享連結
  const copyStudentLink = (studentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('book', currentBook.id);
    url.searchParams.set('student', studentName);
    navigator.clipboard.writeText(url.toString());
    setCopiedName(studentName);
    setTimeout(() => setCopiedName(null), 2000);
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-sm border border-indigo-100">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          冊子「{currentBook.title}」尚無成績資料
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
          現在即可上傳成績單或考卷截圖。最多只要輸入學生名字，系統會自動歸納成該學生的多頁翻閱冊。
        </p>
        <button
          type="button"
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>立即上傳第一批成績圖</span>
        </button>
      </div>
    );
  }

  if (filteredStudents.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        找不到符合「{searchQuery}」的學生
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 頂部資訊列 */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">學生名單</span>
          <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-full font-medium">
            共 {filteredStudents.length} 人
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          點選卡片開啟大圖翻閱模式
        </span>
      </div>

      {/* 學生卡片網格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {filteredStudents.map((student) => {
          const firstImage = student.images[0];
          const imageCount = student.images.length;
          const isCopied = copiedName === student.studentName;

          return (
            <div
              key={student.studentName}
              onClick={() => onOpenViewer(student.studentName, 0)}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
            >
              {/* 封面截圖預覽 */}
              <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                {firstImage ? (
                  <img
                    src={firstImage.url}
                    alt={student.studentName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center">
                    <Images className="w-8 h-8 stroke-1" />
                    <span className="text-[10px] mt-1">無截圖</span>
                  </div>
                )}

                {/* 頁數標籤 */}
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Images className="w-3 h-3" />
                  <span>{imageCount} 頁</span>
                </div>

                {/* 懸浮快速預覽按鈕 */}
                <div className="absolute inset-0 bg-indigo-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/95 text-indigo-700 text-xs font-bold rounded-full shadow-md">
                    <Eye className="w-3.5 h-3.5" />
                    翻閱
                  </span>
                </div>
              </div>

              {/* 卡片下半部：姓名與動作列 */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="truncate">{student.studentName}</span>
                  </h4>
                </div>

                {/* 底部快捷按鈕：複製專屬連結、刪除 */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={(e) => copyStudentLink(student.studentName, e)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      isCopied
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'text-indigo-600 hover:bg-indigo-50'
                    }`}
                    title="複製此學生的專屬分享網址"
                  >
                    {isCopied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                    <span>{isCopied ? '已複製' : '專屬連結'}</span>
                  </button>

                  {!isViewOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`確定要刪除「${student.studentName}」的所有成績截圖嗎？`)) {
                          onDeleteStudent(student.studentName);
                        }
                      }}
                      className="p-1 text-slate-300 hover:text-rose-500 rounded hover:bg-rose-50 transition-colors"
                      title="刪除此學生"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
