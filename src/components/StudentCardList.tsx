import React, { useState } from 'react';
import { 
  Images, 
  Trash2, 
  Eye, 
  Share2, 
  UploadCloud, 
  Check, 
  Download,
  Users
} from 'lucide-react';
import type { ExamBook, StudentFolder } from '../types';
import { downloadPersonImages } from '../utils/zipExporter';

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
  const [downloadingName, setDownloadingName] = useState<string | null>(null);

  const students = Object.values(currentBook.students || {});

  // 搜尋過濾
  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    return s.studentName.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  // 排序：依繁體中文筆畫排序
  filteredStudents.sort((a, b) => a.studentName.localeCompare(b.studentName, 'zh-Hant'));

  // 複製單一成員專屬分享連結
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

  // 分人打包下載
  const handleDownloadPerson = async (studentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const folder = currentBook.students?.[studentName];
    if (!folder?.images || folder.images.length === 0) return;

    setDownloadingName(studentName);
    await downloadPersonImages(studentName, folder.images);
    setDownloadingName(null);
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-10 sm:py-16 px-6 bg-[#F6F9FB]/90 backdrop-blur-xs rounded-3xl border border-[#D6E1EA] shadow-2xs my-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-[#EDE7DC] flex items-center justify-center text-[#16202A] mb-3 shadow-2xs border border-[#D6E1EA]">
          <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7 text-[#16202A]" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-[#16202A] font-serif">
          此冊尚無任何圖片
        </h3>
        <p className="text-xs sm:text-sm text-[#16202A]/60 max-w-xs sm:max-w-sm mx-auto mt-1.5 mb-5">
          點擊下方按鈕上傳照片或截圖，系統會自動歸納成冊。
        </p>
        <button
          type="button"
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold text-white bg-[#16202A] hover:bg-[#253342] rounded-full shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <UploadCloud className="w-4 h-4 text-white" />
          <span>＋ 立即上傳圖片</span>
        </button>
      </div>
    );
  }

  if (filteredStudents.length === 0) {
    return (
      <div className="text-center py-12 text-[#16202A]/40 text-xs">
        找不到符合「{searchQuery}」的成員
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 頂部資訊列 */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-[#16202A]/70 px-1 font-medium">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#16202A]">成員名冊列表</span>
          <span className="px-2.5 py-0.5 bg-[#8A5638]/10 text-[#8A5638] border border-[#8A5638]/20 rounded-full font-bold text-xs">
            共 {filteredStudents.length} 人
          </span>
        </div>
        <span className="text-xs text-[#16202A]/40 hidden sm:inline">
          點選卡片開啟大圖翻閱
        </span>
      </div>

      {/* 成員卡片自適應網格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {filteredStudents.map((student) => {
          const firstImage = student.images[0];
          const imageCount = student.images.length;
          const isCopied = copiedName === student.studentName;
          const isDownloading = downloadingName === student.studentName;

          return (
            <div
              key={student.studentName}
              onClick={() => onOpenViewer(student.studentName, 0)}
              className="group bg-[#F1F5F9] rounded-2xl border border-[#D6E1EA] hover:border-[#16202A] hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col active:scale-[0.98]"
            >
              {/* 圖片封面預覽 */}
              <div className="aspect-[4/3] bg-[#E9EFF4] relative overflow-hidden flex items-center justify-center">
                {firstImage ? (
                  <img
                    src={firstImage.url}
                    alt={student.studentName}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300 filter brightness-[0.98]"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-[#16202A]/30 flex flex-col items-center">
                    <Images className="w-8 h-8 stroke-1" />
                    <span className="text-[10px] mt-1">無截圖</span>
                  </div>
                )}

                {/* 頁數標籤：海軍黑微透膠囊 */}
                <div className="absolute top-2 right-2 bg-[#16202A]/85 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <Images className="w-3 h-3 text-white" />
                  <span>{imageCount} 張</span>
                </div>

                {/* 懸浮預覽標籤 */}
                <div className="absolute inset-0 bg-[#16202A]/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-[#16202A] text-xs font-bold rounded-full shadow-md">
                    <Eye className="w-3.5 h-3.5 text-[#16202A]" />
                    翻閱
                  </span>
                </div>
              </div>

              {/* 底部成員姓名與小動作 */}
              <div className="p-3 flex items-center justify-between gap-1 bg-[#F1F5F9] border-t border-[#D6E1EA]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#E5EDF4] text-[#16202A] flex items-center justify-center flex-shrink-0 text-xs font-bold border border-[#D6E1EA]">
                    {student.studentName.slice(0, 1)}
                  </div>
                  <h4 className="font-bold text-[#16202A] text-xs sm:text-sm truncate">
                    {student.studentName}
                  </h4>
                </div>

                {/* 簡潔小動作列：分人打包下載、複製個人連結、刪除 */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {/* 分人打包下載按鈕 */}
                  <button
                    type="button"
                    onClick={(e) => handleDownloadPerson(student.studentName, e)}
                    disabled={imageCount === 0 || isDownloading}
                    className="p-1.5 text-[#16202A]/40 hover:text-[#16202A] hover:bg-[#E9EFF4] rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                    title={`打包下載 ${student.studentName} 的所有圖片`}
                  >
                    <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce text-[#16202A]' : ''}`} />
                  </button>

                  {/* 複製個人連結 */}
                  <button
                    type="button"
                    onClick={(e) => copyStudentLink(student.studentName, e)}
                    className="p-1.5 text-[#16202A]/40 hover:text-[#16202A] hover:bg-[#E9EFF4] rounded-lg transition-colors cursor-pointer"
                    title={isCopied ? '已複製個人專屬連結' : '複製個人專屬連結'}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                  </button>

                  {!isViewOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`確定刪除「${student.studentName}」的所有圖片嗎？`)) {
                          onDeleteStudent(student.studentName);
                        }
                      }}
                      className="p-1.5 text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="刪除此成員"
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
