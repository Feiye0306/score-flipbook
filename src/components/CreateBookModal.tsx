import React, { useState, useEffect } from 'react';
import { BookOpen, X, Plus } from 'lucide-react';

interface CreateBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBook: (title: string) => void;
}

export const CreateBookModal: React.FC<CreateBookModalProps> = ({
  isOpen,
  onClose,
  onCreateBook,
}) => {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreateBook(title.trim());
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-[#D6E1EA] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部標題 */}
        <div className="flex items-center justify-between pb-3 border-b border-[#D6E1EA]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#6E3E26]/10 text-[#6E3E26] flex items-center justify-center border border-[#6E3E26]/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#16202A] font-sans">
              建立新圖文冊
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-[#16202A] hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 內容說明 */}
        <p className="text-xs sm:text-sm text-[#16202A]/70 mt-3.5 mb-5 leading-relaxed font-sans">
          請為新的相冊命名（例如：「113第一次段考」、「高三模擬考自然」或「活動照片集」），建立後即可開始上傳圖片。
        </p>

        {/* 輸入表單 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#16202A] mb-1.5 font-sans">
              冊子名稱
            </label>
            <input
              type="text"
              autoFocus
              placeholder="請輸入冊子名稱..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-[#F1F5F9] border border-[#D6E1EA] focus:border-[#6E3E26] rounded-xl outline-none font-sans text-[#16202A] transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-[#16202A]/70 hover:text-[#16202A] hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#6E3E26] hover:bg-[#59301B] disabled:opacity-40 rounded-full shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>確認建立</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
