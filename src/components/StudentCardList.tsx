import React, { useState } from 'react';
import { 
  Images, 
  Trash2, 
  Eye, 
  Share2, 
  UploadCloud, 
  Check, 
  User,
  BookOpen
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
  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    return s.studentName.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  // 排序：依學生姓名筆畫排序
  filteredStudents.sort((a, b) => a.studentName.localeCompare(b.studentName, 'zh-Hant'));

  // 複製單一學生個人專屬分享連結
  const copyStudentLink = (studentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = new URL(window.location.origin + window.location.pathname);
    const code = currentBook.shareCode || currentBook.id;
    url.searchParams.set('share', code);
    url.searchParams.set('student', studentName);
    navigator.clipboard.writeText(url.toString());
    setCopiedName(studentName);
    setTimeout(() => setCopiedName(null), 2000);
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white rounded-3xl border border-stone-200/80 shadow-sm my-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center text-amber-800 mb-3 shadow-sm border border-amber-200/60">
          <UploadCloud className="w-8 h-8 text-amber-700" />
        </div>
        <h3 className="text-base font-bold text-stone-900 font-serif">
          冊子「{currentBook.title}」尚無成績截圖
        </h3>
        <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-5">
          直接點擊下方按鈕上傳考卷或成績圖片，系統會自動辨識學生姓名並排好翻閱順序。
        </p>
        <button
          type="button"
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <UploadCloud className="w-4 h-4 text-amber-400" />
          <span>立即上傳成績圖</span>
        </button>
      </div>
    );
  }

  if (filteredStudents.length === 0) {
    return (
      <div className="text-center py-12 text-stone-400 text-xs">
        找不到符合「{searchQuery}」的學生
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 頂部資訊列 */}
      <div className="flex items-center justify-between text-xs text-stone-500 px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-stone-800">學生考卷列表</span>
          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-full font-bold text-[11px]">
            共 {filteredStudents.length} 人
          </span>
        </div>
        <span className="text-[11px] text-stone-400">
          點卡片開大圖翻閱
        </span>
      </div>

      {/* 學生卡片自適應網格 (手機 2 欄，平版 3 欄，電腦 4~5 欄) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {filteredStudents.map((student) => {
          const firstImage = student.images[0];
          const imageCount = student.images.length;
          const isCopied = copiedName === student.studentName;

          return (
            <div
              key={student.studentName}
              onClick={() => onOpenViewer(student.studentName, 0)}
              className="group bg-white rounded-2xl border border-stone-200/90 hover:border-amber-400 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer flex flex-col active:scale-[0.98]"
            >
              {/* 考卷封面預覽 */}
              <div className="aspect-[4/3] bg-stone-100 relative overflow-hidden flex items-center justify-center">
                {firstImage ? (
                  <img
                    src={firstImage.url}
                    alt={student.studentName}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300 filter brightness-[0.98]"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-stone-300 flex flex-col items-center">
                    <Images className="w-8 h-8 stroke-1" />
                    <span className="text-[10px] mt-1">無截圖</span>
                  </div>
                )}

                {/* 頁數標籤 */}
                <div className="absolute top-2 right-2 bg-stone-900/75 backdrop-blur-sm text-stone-100 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Images className="w-3 h-3 text-amber-300" />
                  <span>{imageCount} 頁</span>
                </div>

                {/* 懸浮預覽標籤 */}
                <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/95 text-stone-900 text-xs font-bold rounded-full shadow-md">
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    翻閱
                  </span>
                </div>
              </div>

              {/* 底部學生姓名與小動作 */}
              <div className="p-2.5 sm:p-3 flex items-center justify-between gap-1 bg-white border-t border-stone-100">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center flex-shrink-0 text-xs font-bold border border-stone-200">
                    {student.studentName.slice(0, 1)}
                  </div>
                  <h4 className="font-bold text-stone-900 text-xs truncate">
                    {student.studentName}
                  </h4>
                </div>

                {/* 簡潔小圖示列 */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => copyStudentLink(student.studentName, e)}
                    className="p-1.5 text-stone-400 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                    title={isCopied ? '已複製個人專屬連結' : '複製個人專屬連結'}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                  </button>

                  {!isViewOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`確定刪除「${student.studentName}」的成績截圖嗎？`)) {
                          onDeleteStudent(student.studentName);
                        }
                      }}
                      className="p-1.5 text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
