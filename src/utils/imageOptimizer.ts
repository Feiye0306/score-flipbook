// 考卷與成績單高解析度圖片智慧優化器 (保持字跡銳利，極限瘦身加速)

export interface OptimizedResult {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
}

/**
 * 智慧壓縮並優化圖片
 * @param file 原始圖片檔案
 * @param maxDimension 最大長寬 (預設 2400px，足以清晰辨識考卷算式與評語)
 * @param quality 輸出畫質 (預設 0.85)
 */
export async function optimizeScoreImage(
  file: File,
  maxDimension = 2400,
  quality = 0.85
): Promise<OptimizedResult> {
  // 如果不是圖片，直接傳回
  if (!file.type.startsWith('image/')) {
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      width: 0,
      height: 0,
      originalSize: file.size,
      optimizedSize: file.size,
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // 如果長寬都小於 maxDimension 且檔案小於 1MB，則可保持原樣
      if (width <= maxDimension && height <= maxDimension && file.size < 1024 * 1024) {
        resolve({
          file,
          previewUrl: URL.createObjectURL(file),
          width,
          height,
          originalSize: file.size,
          optimizedSize: file.size,
        });
        return;
      }

      // 等比例縮小
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          file,
          previewUrl: URL.createObjectURL(file),
          width: img.width,
          height: img.height,
          originalSize: file.size,
          optimizedSize: file.size,
        });
        return;
      }

      // 高品質平滑縮放
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // 優先使用 image/webp，若瀏覽器不支援則降級使用 image/jpeg
      const outputType = 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              file,
              previewUrl: URL.createObjectURL(file),
              width,
              height,
              originalSize: file.size,
              optimizedSize: file.size,
            });
            return;
          }

          const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
          const optimizedFile = new File([blob], newFileName, {
            type: outputType,
            lastModified: Date.now(),
          });

          resolve({
            file: optimizedFile,
            previewUrl: URL.createObjectURL(blob),
            width,
            height,
            originalSize: file.size,
            optimizedSize: optimizedFile.size,
          });
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('圖片讀取失敗'));
    };

    img.src = objectUrl;
  });
}
