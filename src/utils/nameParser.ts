// 智慧檔名學生姓名與頁碼解析器

export interface ParsedFileName {
  studentName: string;
  pageOrder: number;
}

/**
 * 從檔名智慧解析學生姓名與頁面順序
 * 範例支援：
 * - 王小明_1.jpg -> { studentName: "王小明", pageOrder: 1 }
 * - 王小明(2).png -> { studentName: "王小明", pageOrder: 2 }
 * - 105號_陳大同_p3.jpg -> { studentName: "陳大同", pageOrder: 3 }
 * - 林美惠-考卷.jpeg -> { studentName: "林美惠", pageOrder: 1 }
 * - 數學_李小龍.jpg -> { studentName: "李小龍", pageOrder: 1 }
 */
export function parseStudentNameFromFileName(fileName: string): ParsedFileName {
  // 去除副檔名
  const baseName = fileName.replace(/\.[^/.]+$/, '').trim();

  // 1. 嘗試解析頁碼 (如 _1, -2, (3), p2, page1, 第2頁)
  let pageOrder = 1;
  const pageMatch = baseName.match(/(?:_|-|\(|\[|\s)*(?:p|page|第)?(\d+)(?:頁|\)|\])?$/i);
  let cleanName = baseName;
  if (pageMatch && pageMatch[1]) {
    pageOrder = parseInt(pageMatch[1], 10);
    // 移除頁碼後綴
    cleanName = cleanName.substring(0, pageMatch.index).trim();
  }

  // 2. 移除常見非姓名詞彙 (如: 數學, 英文, 國文, 理化, 考卷, 成績單, 段考, 週考, 第一次, 第二次, 模考, 113, 114)
  const noisePattern = /(?:第一次|第二次|第三次|第一次段考|第二次段考|第三次段考|期中考|期末考|週考|模擬考|段考|小考|複習考|成績單|考卷|作答卷|數學|英文|國文|理化|自然|社會|生物|歷史|地理|公民|物理|化學)/g;
  let candidate = cleanName.replace(noisePattern, '');

  // 3. 移除分隔符號如底線、橫線、括號、學號座號數字 (如: 101_, No.5, 座號3)
  candidate = candidate.replace(/(?:座號|學號|No\.?|\d{1,4}[號_\-\s])/gi, '');
  candidate = candidate.replace(/[_\-\(\)\[\]【】\s]+/g, ' ').trim();

  // 4. 比對中文姓名 (通常為 2 ~ 4 個中文字)
  const chineseNameMatch = candidate.match(/[\u4e00-\u9fa5]{2,4}/);
  if (chineseNameMatch) {
    return {
      studentName: chineseNameMatch[0],
      pageOrder: isNaN(pageOrder) ? 1 : pageOrder,
    };
  }

  // 5. 若為英文姓名 (如: "David Wang", "Alice Chen")
  const englishNameMatch = candidate.match(/[A-Za-z]+(?:\s+[A-Za-z]+)?/);
  if (englishNameMatch && !candidate.startsWith('IMG') && !candidate.startsWith('Screenshot') && !candidate.startsWith('SCAN')) {
    return {
      studentName: englishNameMatch[0].trim(),
      pageOrder: isNaN(pageOrder) ? 1 : pageOrder,
    };
  }

  // 無法推斷出姓名時，傳回空字串，由使用者自行打名字
  return {
    studentName: '',
    pageOrder: isNaN(pageOrder) ? 1 : pageOrder,
  };
}
