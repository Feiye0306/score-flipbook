// 考卷與成績單高解析度圖片智慧優化器 (保持字跡銳利，極限瘦身加速，含 1.5s 超時安全防護)

export interface OptimizedResult {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
}

/**
 * 智慧壓縮並優化圖片 (強制超時保證絕不卡死)
 */
export async function optimizeScoreImage(
  file: File,
  maxDimension = 1400,
  quality = 0.72
): Promise<OptimizedResult> {
  const fallbackResult: OptimizedResult = {
    file,
    previewUrl: URL.createObjectURL(file),
    width: 0,
    height: 0,
    originalSize: file.size,
    optimizedSize: file.size,
  };

  // 如果不是一般圖片格式，直接回退
  if (!file.type.startsWith('image/')) {
    return fallbackResult;
  }

  // 1.5 秒超時賽跑，防止大圖解碼卡住整個流程
  const timeoutPromise = new Promise<OptimizedResult>((resolve) => {
    setTimeout(() => {
      resolve(fallbackResult);
    }, 1500);
  });

  const compressPromise = new Promise<OptimizedResult>((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          let { width, height } = img;

          // 若檔案本來就小於 800KB 且解析度適中，直接使用
          if (width <= maxDimension && height <= maxDimension && file.size < 800 * 1024) {
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
            resolve(fallbackResult);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const isWebpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
          const mimeType = isWebpSupported ? 'image/webp' : 'image/jpeg';
          const ext = isWebpSupported ? '.webp' : '.jpg';

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(fallbackResult);
                return;
              }
              const newFileName = file.name.replace(/\.[^/.]+$/, '') + ext;
              const optimizedFile = new File([blob], newFileName, {
                type: mimeType,
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
            mimeType,
            quality
          );
        } catch {
          resolve(fallbackResult);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(fallbackResult);
      };

      img.src = objectUrl;
    } catch {
      resolve(fallbackResult);
    }
  });

  return Promise.race([compressPromise, timeoutPromise]);
}
