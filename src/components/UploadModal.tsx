import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  UploadCloud, 
  Trash2, 
  Sparkles, 
  Users, 
  FileImage, 
  CheckCircle2, 
  AlertCircle,
  FileCheck,
  Zap
} from 'lucide-react';
import type { ExamBook, ScoreImage } from '../types';
import { parseStudentNameFromFileName } from '../utils/nameParser';
import { optimizeScoreImage } from '../utils/imageOptimizer';
import { uploadImageToCloud } from '../services/storageService';
import { appendImagesToStudent } from '../services/dbService';

interface UploadModalProps {
  currentBook: ExamBook;
  books?: ExamBook[];
  onSelectBook?: (bookId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
}

interface UploadDraft {
  id: string;
  file: File;
  previewUrl: string;
  studentName: string;
  pageOrder: number;
  originalSize: number;
  optimizedSize: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMessage?: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  currentBook,
  books,
  onSelectBook,
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const [targetBookId, setTargetBookId] = useState<string>(currentBook?.id || '');
  const [drafts, setDrafts] = useState<UploadDraft[]>([]);
  const [batchName, setBatchName] = useState('');
  const [enableCompress, setEnableCompress] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 當前選定的目標書冊
  const activeBook = (books && books.find((b) => b.id === targetBookId)) || currentBook;

  // 取得目標冊子現有學生名單作為快速標籤
  const existingStudentNames = Object.keys(activeBook?.students || {});

  // 打開或 currentBook 更新時同步目標冊子與清理 drafts
  useEffect(() => {
    if (isOpen) {
      if (currentBook?.id) {
        setTargetBookId(currentBook.id);
      }
    } else {
      drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
      setDrafts([]);
      setBatchName('');
      setIsProcessing(false);
      setOverallProgress(0);
    }
  }, [isOpen, currentBook?.id]);

  if (!isOpen) return null;

  // 處理選擇或拖曳的檔案
  const handleFiles = async (files: FileList | File[]) => {
    const newDrafts: UploadDraft[] = [];
    const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'));

    for (const file of fileList) {
      const parsed = parseStudentNameFromFileName(file.name);
      const previewUrl = URL.createObjectURL(file);

      newDrafts.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl,
        studentName: parsed.studentName || batchName || '',
        pageOrder: parsed.pageOrder || (drafts.length + newDrafts.length + 1),
        originalSize: file.size,
        optimizedSize: file.size,
        status: 'pending',
        progress: 0,
      });
    }

    setDrafts((prev) => [...prev, ...newDrafts]);
  };

  // 批次套用姓名到全部
  const applyBatchNameToAll = () => {
    if (!batchName.trim()) return;
    setDrafts((prev) =>
      prev.map((d, index) => ({
        ...d,
        studentName: batchName.trim(),
        pageOrder: index + 1, // 同一學生時依序編排頁碼 1, 2, 3...
      }))
    );
  };

  // 刪除單個草稿
  const removeDraft = (id: string) => {
    setDrafts((prev) => {
      const item = prev.find((d) => d.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((d) => d.id !== id);
    });
  };

  // 更新單個草稿姓名
  const updateDraftName = (id: string, name: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, studentName: name } : d))
    );
  };

  // 更新單個草稿頁碼
  const updateDraftPage = (id: string, page: number) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, pageOrder: page } : d))
    );
  };

  // 開始上傳
  const startUpload = async () => {
    if (drafts.length === 0) return;
    setIsProcessing(true);

    // 依學生姓名分組
    const studentGroups: Record<string, UploadDraft[]> = {};
    drafts.forEach((d) => {
      const name = d.studentName.trim() || '未分類學生';
      if (!studentGroups[name]) studentGroups[name] = [];
      studentGroups[name].push(d);
    });

    let uploadedCount = 0;
    const totalFiles = drafts.length;

    for (const [studentName, items] of Object.entries(studentGroups)) {
      const uploadedImages: ScoreImage[] = [];

      for (const item of items) {
        // 更新單張狀態為上傳中
        setDrafts((prev) =>
          prev.map((d) => (d.id === item.id ? { ...d, status: 'uploading' } : d))
        );

        try {
          // 1. 是否啟用智慧壓縮
          let uploadTargetFile = item.file;
          let imgWidth = 0;
          let imgHeight = 0;

          if (enableCompress) {
            const opt = await optimizeScoreImage(item.file);
            uploadTargetFile = opt.file;
            imgWidth = opt.width;
            imgHeight = opt.height;
          }

          // 2. 上傳到 Firebase Storage (或本地備份)
          const uploadRes = await uploadImageToCloud(
            currentBook.id,
            studentName,
            uploadTargetFile,
            (prog) => {
              setDrafts((prev) =>
                prev.map((d) => (d.id === item.id ? { ...d, progress: prog } : d))
              );
            }
          );

          uploadedImages.push({
            id: 'img_' + Math.random().toString(36).substring(2, 9),
            url: uploadRes.url,
            storagePath: uploadRes.storagePath,
            name: item.file.name,
            createdAt: Date.now(),
            order: item.pageOrder,
            width: imgWidth,
            height: imgHeight,
          });

          // 標記成功
          setDrafts((prev) =>
            prev.map((d) =>
              d.id === item.id ? { ...d, status: 'success', progress: 100 } : d
            )
          );
        } catch (err: any) {
          console.error('上傳單張失敗：', err);
          setDrafts((prev) =>
            prev.map((d) =>
              d.id === item.id
                ? { ...d, status: 'error', errorMessage: err?.message || '上傳失敗' }
                : d
            )
          );
        }

        uploadedCount++;
        setOverallProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      // 將此學生上傳的所有圖片寫入資料庫
      if (uploadedImages.length > 0) {
        await appendImagesToStudent(activeBook.id, studentName, uploadedImages);
      }
    }

    setIsProcessing(false);
    if (onUploadComplete) {
      setTimeout(() => {
        onUploadComplete();
      }, 1000);
    }
  };

  const allSuccess = drafts.length > 0 && drafts.every((d) => d.status === 'success');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200 border border-[#D6E1EA]">
        {/* 頂部標題列 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D6E1EA]">
          <div className="flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#16202A] flex items-center gap-2 font-serif">
                <UploadCloud className="w-5 h-5 text-[#8A5638]" />
                上傳截圖至：
              </h2>
              {books && books.length > 1 ? (
                <select
                  value={targetBookId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setTargetBookId(newId);
                    onSelectBook?.(newId);
                  }}
                  className="font-serif font-bold text-sm sm:text-base text-[#16202A] bg-[#EDE7DC]/70 hover:bg-[#EDE7DC] border border-[#D6E1EA] rounded-xl px-3 py-1 outline-none cursor-pointer focus:border-[#8A5638] transition-colors"
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({Object.keys(b.students || {}).length} 位成員)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-serif font-bold text-base sm:text-lg text-[#16202A]">
                  「{activeBook.title}」
                </span>
              )}
            </div>
            <p className="text-xs text-[#8A5638]/80 mt-1">
              最多只要打學生名字！一個人可傳多張截圖，會自動歸納在該學生的同一冊中。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-[#16202A] hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 內容主體區 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 拖曳/上傳框 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-[#D6E1EA] hover:border-[#8A5638] bg-[#EDE7DC]/15 hover:bg-[#EDE7DC]/30 rounded-2xl p-6 text-center transition-all cursor-pointer group"
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
              }}
            />
            <div className="w-12 h-12 mx-auto rounded-full bg-[#8A5638]/10 group-hover:scale-110 flex items-center justify-center text-[#8A5638] transition-transform mb-2 border border-[#8A5638]/20">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#16202A]">
              點擊選取或直接將考卷 / 成績圖片拖曳到此處
            </p>
            <p className="text-xs text-[#8A5638]/80 mt-1">
              支援多選（可一次拖入多張截圖），支援 JPG、PNG、WebP、HEIC 照片
            </p>
          </div>

          {/* 批次設定輔助列 */}
          {drafts.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <Users className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                    若是同一人的多張考卷：
                  </span>
                  <input
                    type="text"
                    placeholder="輸入學生姓名..."
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none w-32"
                  />
                  <button
                    type="button"
                    onClick={applyBatchNameToAll}
                    disabled={!batchName.trim()}
                    className="px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
                  >
                    套用至下方全部
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* 壓縮開關 */}
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableCompress}
                      onChange={(e) => setEnableCompress(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>高清智慧壓縮 (加速上傳與秒開)</span>
                  </label>
                </div>
              </div>

              {/* 既有學生名單快選標籤 */}
              {existingStudentNames.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60 text-xs text-slate-500">
                  <span className="text-[11px] font-medium text-slate-400">已有名單快選：</span>
                  {existingStudentNames.slice(0, 8).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setBatchName(name)}
                      className="px-2 py-0.5 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded text-[11px] transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 待上傳圖片清單 */}
          {drafts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
                <span>待歸檔圖片 ({drafts.length} 張)</span>
                {!isProcessing && (
                  <button
                    type="button"
                    onClick={() => {
                      drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
                      setDrafts([]);
                    }}
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    清空列表
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {drafts.map((d, idx) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-sm"
                  >
                    {/* 縮圖 */}
                    <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                      <img
                        src={d.previewUrl}
                        alt="預覽"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* 檔名與資訊 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate" title={d.file.name}>
                        {d.file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {/* 學生姓名輸入框 */}
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-400">學生：</span>
                          <input
                            type="text"
                            placeholder="輸入姓名"
                            value={d.studentName}
                            disabled={isProcessing}
                            onChange={(e) => updateDraftName(d.id, e.target.value)}
                            className="px-2 py-0.5 text-xs font-semibold text-indigo-700 bg-indigo-50/50 border border-indigo-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded outline-none w-24"
                          />
                        </div>

                        {/* 頁碼設定 */}
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-400">第</span>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={d.pageOrder}
                            disabled={isProcessing}
                            onChange={(e) => updateDraftPage(d.id, parseInt(e.target.value) || 1)}
                            className="px-1.5 py-0.5 text-xs text-center border border-slate-300 rounded outline-none w-10"
                          />
                          <span className="text-[11px] text-slate-400">頁</span>
                        </div>
                      </div>
                    </div>

                    {/* 上傳進度或狀態 */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {d.status === 'uploading' && (
                        <div className="w-12 text-center text-[11px] font-bold text-indigo-600 animate-pulse">
                          {d.progress}%
                        </div>
                      )}
                      {d.status === 'success' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      )}
                      {d.status === 'error' && (
                        <span title={d.errorMessage}>
                          <AlertCircle className="w-5 h-5 text-rose-500" />
                        </span>
                      )}
                      {d.status === 'pending' && !isProcessing && (
                        <button
                          type="button"
                          onClick={() => removeDraft(d.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 總進度條 */}
          {isProcessing && (
            <div className="bg-slate-50 border border-indigo-100 rounded-xl p-3">
              <div className="flex justify-between text-xs font-semibold text-indigo-900 mb-1">
                <span>正在上傳雲端歸檔...</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-200"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 底部動作列 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50/60 rounded-b-2xl">
          <div className="text-xs text-stone-500">
            {allSuccess ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                全部圖片已成功歸檔上傳！
              </span>
            ) : (
              <span>共選取 {drafts.length} 張圖片</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (allSuccess && onUploadComplete) {
                  onUploadComplete();
                } else {
                  onClose();
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl transition-colors cursor-pointer"
            >
              {allSuccess ? '✅ 完成並檢視冊子' : '取消'}
            </button>
            {!allSuccess && (
              <button
                type="button"
                onClick={startUpload}
                disabled={drafts.length === 0 || isProcessing}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#8A5638] hover:bg-[#73452B] disabled:opacity-40 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-white" />
                <span>{isProcessing ? '正在歸檔上傳...' : '🚀 開始上傳歸檔'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
