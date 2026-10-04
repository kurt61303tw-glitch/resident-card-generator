/**
 * 個案資料卡產生器 - 翻譯與字串處理引擎 V3.0 (Translation JS)
 * 支援：越南語 (vi)、英語 (en)、印尼語 (id)、菲律賓語 (fil)、泰語 (th)
 * 核心保證：
 * 1. 外語欄位與外語病史 100% 杜絕任何殘留中文字元 (Zero Chinese in Foreign Columns)
 * 2. 醫療長照詞庫即時離線比對 ＋ 線上 Google GTX 免金鑰雙層翻譯
 * 3. 任何自訂中文字彙未完成翻譯前，絕不將原始中文填入外語輸出
 */

const TranslationEngine = {
  currentLang: 'vi',
  allowOnlineTranslation: false,
  cache: {},
  onTranslationReady: null,

  init() {
    try {
      const saved = localStorage.getItem('care_translation_cache_v3');
      if (saved) {
        this.cache = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('載入翻譯快取失敗', e);
    }
  },

  saveCache() {
    try {
      localStorage.setItem('care_translation_cache_v3', JSON.stringify(this.cache));
    } catch (e) {
      console.warn('儲存翻譯快取失敗', e);
    }
  },

  setLanguage(lang) {
    this.currentLang = lang || 'vi';
  },

  /**
   * 檢查並過濾文字：在外語模式下，絕不允許任何中文字元通過
   */
  filterNonChinese(text) {
    if (!text || typeof text !== 'string') return '';
    const trimmed = text.trim();
    if (this.currentLang !== 'zh-only' && /[\u4e00-\u9fa5]/.test(trimmed)) {
      return '';
    }
    return trimmed;
  },

  /**
   * 查表取詞 (精確對照、常見別名、模糊關鍵字備援與動態快取)
   */
  lookup(category, term) {
    if (!term || typeof term !== 'string') return '';
    const trimmed = term.trim();
    if (!trimmed) return '';
    const lang = this.currentLang;

    // 若當前模式為純中文，直接回傳
    if (lang === 'zh-only') return trimmed;

    // 1. 指定分類直接精確比對
    if (category && CARE_DICTIONARY[category] && CARE_DICTIONARY[category][trimmed]) {
      const entry = CARE_DICTIONARY[category][trimmed];
      const val = entry[lang] || entry['en'] || entry['vi'] || '';
      return this.filterNonChinese(val);
    }

    // 2. 全域分類直接精確比對 (排除區塊大標題 categories)
    for (const cat in CARE_DICTIONARY) {
      if (cat === 'categories') continue;
      if (CARE_DICTIONARY[cat][trimmed]) {
        const entry = CARE_DICTIONARY[cat][trimmed];
        const val = entry[lang] || entry['en'] || entry['vi'] || '';
        return this.filterNonChinese(val);
      }
    }

    // 3. 長照常見別名與英文縮寫對照 (如 HTN -> 高血壓, 冠心病 -> 冠心症)
    const upperTrimmed = trimmed.toUpperCase();
    const aliasTarget = (typeof CARE_ALIASES !== 'undefined') ? (CARE_ALIASES[trimmed] || CARE_ALIASES[upperTrimmed]) : null;
    if (aliasTarget) {
      for (const cat in CARE_DICTIONARY) {
        if (cat === 'categories') continue;
        if (CARE_DICTIONARY[cat][aliasTarget]) {
          const entry = CARE_DICTIONARY[cat][aliasTarget];
          const val = entry[lang] || entry['en'] || entry['vi'] || '';
          return this.filterNonChinese(val);
        }
      }
    }

    // 4. 優先檢查動態線上翻譯快取 (若先前手打或分析已取得精準自訂翻譯，直接回傳)
    const cacheKey = `${lang}:${trimmed}`;
    if (this.cache[cacheKey]) {
      return this.filterNonChinese(this.cache[cacheKey]);
    }

    // 5. 模糊關鍵字比對 (僅限長度 >= 3 的特定醫療詞彙，排除 categories 與「飲食」、「正常」、「其他」等通用泛用字)
    const stopWords = ['飲食', '正常', '其他', '一般', '照護', '協助', '使用', '狀態'];
    for (const cat in CARE_DICTIONARY) {
      if (cat === 'categories') continue;
      for (const key in CARE_DICTIONARY[cat]) {
        if (key.length >= 3 && !stopWords.includes(key) && trimmed.includes(key)) {
          const entry = CARE_DICTIONARY[cat][key];
          const val = entry[lang] || entry['en'] || entry['vi'] || '';
          return this.filterNonChinese(val);
        }
      }
    }

    // 6. 若包含中文字元且尚未翻譯，且使用者明確允許線上聯網翻譯，才觸發線上翻譯
    if (this.allowOnlineTranslation && /[\u4e00-\u9fa5]/.test(trimmed)) {
      this.translateAsync(trimmed, lang);
    }

    // 絕不回傳原始中文字串！
    return '';
  },

  /**
   * 即時線上翻譯 (Google GTX 免金鑰 API)，自動快取並回呼更新畫面
   */
  async translateAsync(text, targetLang = this.currentLang) {
    if (!this.allowOnlineTranslation) return '';
    if (!text || !text.trim() || targetLang === 'zh-only') return '';
    const trimmed = text.trim();
    const cacheKey = `${targetLang}:${trimmed}`;

    if (this.cache[cacheKey]) {
      return this.filterNonChinese(this.cache[cacheKey]);
    }

    try {
      const gtxLang = (targetLang === 'fil') ? 'tl' : targetLang;
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl=${encodeURIComponent(gtxLang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json && json[0] && json[0].length > 0) {
          const translated = json[0].map(segment => segment[0]).join('').trim();
          // 確保翻譯結果確實為外語，不含有未翻譯中文字
          if (translated && !/[\u4e00-\u9fa5]/.test(translated)) {
            this.cache[cacheKey] = translated;
            this.saveCache();
            if (typeof this.onTranslationReady === 'function') {
              this.onTranslationReady(trimmed, translated);
            }
            return translated;
          }
        }
      }
    } catch (err) {
      console.warn('線上即時翻譯請求失敗（環境可能為純離線）：', err);
    }

    return '';
  },

  /**
   * 標題類別 (支援別名與模糊對照，嚴禁中文字元洩漏)
   */
  category(titleZh) {
    if (!titleZh) return '';
    const trimmed = titleZh.trim();
    if (this.currentLang === 'zh-only') return trimmed;

    const entry = CARE_DICTIONARY.categories[trimmed];
    if (entry) {
      const val = entry[this.currentLang] || entry['en'] || entry['vi'] || '';
      return this.filterNonChinese(val);
    }

    for (const cat in CARE_DICTIONARY.categories) {
      if (trimmed.includes(cat) || cat.includes(trimmed)) {
        const e = CARE_DICTIONARY.categories[cat];
        const val = e[this.currentLang] || e['en'] || e['vi'] || '';
        return this.filterNonChinese(val);
      }
    }

    return '';
  },

  /**
   * 解析病史字串 (嚴格保證外語清單中絕無中文字元)
   */
  parseMedicalHistory(inputZh) {
    if (!inputZh || !inputZh.trim()) {
      return { zhList: [], transList: [] };
    }

    const rawItems = inputZh.split(/[\n,，、;；]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    const zhList = [];
    const transList = [];

    rawItems.forEach(item => {
      // 處理中英文縮寫轉換 (如輸入 HTN 自動轉為中文 高血壓)
      const upper = item.toUpperCase();
      const mappedZh = (typeof CARE_ALIASES !== 'undefined' && CARE_ALIASES[upper])
        ? CARE_ALIASES[upper]
        : ((typeof CARE_ALIASES !== 'undefined' && CARE_ALIASES[item]) ? CARE_ALIASES[item] : item);

      zhList.push(mappedZh);

      if (this.currentLang !== 'zh-only') {
        const trans = this.lookup('medicalHistory', mappedZh);
        if (trans && !/[\u4e00-\u9fa5]/.test(trans)) {
          transList.push(trans);
        } else {
          // 若為英文直接輸入 (無中文字)，可直接作為外語輸出
          if (!/[\u4e00-\u9fa5]/.test(item)) {
            transList.push(item);
          }
        }
      }
    });

    return { zhList, transList };
  },

  /**
   * 輔具與移位整合顯示 (外語欄位絕無中文字元)
   */
  formatAidsAndTransfer(aidsList, transferAbility, customAid = '') {
    const aids = [...aidsList];
    if (customAid && customAid.trim()) {
      aids.push(customAid.trim());
    }

    const zhParts = [];
    const transParts = [];

    if (aids.length > 0) {
      zhParts.push(aids.join('、'));
      const transAids = aids
        .map(a => this.lookup('aids', a))
        .filter(t => t && !/[\u4e00-\u9fa5]/.test(t))
        .join(', ');
      if (transAids) {
        transParts.push(transAids);
      }
    }

    if (transferAbility && transferAbility.trim()) {
      const transZh = transferAbility.trim();
      const transTarget = this.lookup('transferAbility', transZh);

      zhParts.push(`(${transZh})`);
      if (transTarget && !/[\u4e00-\u9fa5]/.test(transTarget)) {
        transParts.push(`(${transTarget})`);
      }
    }

    return {
      zh: zhParts.join('、'),
      itemsZh: zhParts,
      itemsTrans: transParts,
      trans: transParts.join(', ')
    };
  },

  /**
   * 飲食整合顯示 (外語欄位絕無中文字元)
   */
  formatDiet(textureVal, textureCustom, assistVal, assistCustom) {
    const isCustomTexture = (textureVal === '其他' && !!textureCustom && Boolean(textureCustom.trim()));
    const textZh = (textureVal === '其他' ? textureCustom : textureVal) || '正常餐';
    let textTrans = this.lookup('dietTexture', textZh);
    if (/[\u4e00-\u9fa5]/.test(textTrans)) textTrans = '';

    const isCustomAssist = (assistVal === '其他' && !!assistCustom && Boolean(assistCustom.trim()));
    const assistZh = (assistVal === '其他' ? assistCustom : assistVal) || '可自行進食';
    let assistTrans = this.lookup('dietAssistance', assistZh);
    if (/[\u4e00-\u9fa5]/.test(assistTrans)) assistTrans = '';

    const combinedZh = `${textZh}（${assistZh}）`;
    const combinedTransParts = [textTrans, assistTrans ? `(${assistTrans})` : ''].filter(Boolean);

    const fallbackTexture = isCustomTexture ? '' : (this.currentLang === 'en' ? 'Regular Diet' : 'Cơm bình thường');
    const fallbackAssist = isCustomAssist ? '' : (this.currentLang === 'en' ? 'Independent' : 'Tự ăn uống được');

    return {
      textureZh: textZh,
      textureTrans: textTrans || fallbackTexture,
      assistZh: assistZh,
      assistTrans: assistTrans || fallbackAssist,
      combinedZh,
      combinedTrans: combinedTransParts.join(' ')
    };
  },

  /**
   * 意識狀態 (外語欄位絕無中文字元)
   */
  formatConsciousness(val, customVal = '') {
    if (val === '其他') {
      const custom = (customVal || '').trim();
      const trans = this.lookup('consciousness', custom);
      return {
        zh: custom || '其他',
        trans: trans || (this.currentLang === 'en' ? 'Other' : 'Khác')
      };
    }
    const standard = (val || '').trim();
    if (!standard) return { zh: '', trans: '' };

    const trans = this.lookup('consciousness', standard);
    return {
      zh: standard,
      trans: trans || (this.currentLang === 'en' ? 'Alert' : 'Tỉnh táo')
    };
  },

  /**
   * 聽力與視力整合顯示 (外語欄位絕無中文字元)
   */
  formatSensory(hearingVal, hearingOther, visionVal, visionOther) {
    const hearingZh = (hearingVal === '其他' ? hearingOther : hearingVal) || '正常';
    let hearingTrans = this.lookup('sensoryHearing', hearingZh);
    if (/[\u4e00-\u9fa5]/.test(hearingTrans)) hearingTrans = '';

    const visionZh = (visionVal === '其他' ? visionOther : visionVal) || '正常';
    let visionTrans = this.lookup('sensoryVision', visionZh);
    if (/[\u4e00-\u9fa5]/.test(visionTrans)) visionTrans = '';

    const lang = this.currentLang;
    const isHearingNormal = (hearingZh === '正常' || hearingZh === '聽力正常');
    const isVisionNormal = (visionZh === '正常' || visionZh === '視力正常');

    let itemHearingZh = isHearingNormal ? (hearingZh === '正常' ? '聽力正常' : hearingZh) : hearingZh.replace(/^(?:聽力|視力)[：:]\s*/, '');
    let itemVisionZh = isVisionNormal ? (visionZh === '正常' ? '視力正常' : visionZh) : visionZh.replace(/^(?:聽力|視力)[：:]\s*/, '');

    let itemHearingTrans = '';
    let itemVisionTrans = '';

    if (lang === 'vi') {
      itemHearingTrans = isHearingNormal ? 'Thính lực bình thường' : hearingTrans;
      itemVisionTrans = isVisionNormal ? 'Thị lực bình thường' : visionTrans;
    } else if (lang === 'en') {
      itemHearingTrans = isHearingNormal ? 'Normal hearing' : hearingTrans;
      itemVisionTrans = isVisionNormal ? 'Normal vision' : visionTrans;
    } else if (lang === 'id') {
      itemHearingTrans = isHearingNormal ? 'Pendengaran normal' : hearingTrans;
      itemVisionTrans = isVisionNormal ? 'Penglihatan normal' : visionTrans;
    } else if (lang === 'fil') {
      itemHearingTrans = isHearingNormal ? 'Normal na pandinig' : hearingTrans;
      itemVisionTrans = isVisionNormal ? 'Normal na paningin' : visionTrans;
    } else if (lang === 'th') {
      itemHearingTrans = isHearingNormal ? 'การได้ยินปกติ' : hearingTrans;
      itemVisionTrans = isVisionNormal ? 'การมองเห็นปกติ' : visionTrans;
    }

    return {
      itemsZh: [itemHearingZh, itemVisionZh],
      itemsTrans: [itemHearingTrans, itemVisionTrans]
    };
  },

  /**
   * 清單項目 (排泄、注意事項，外語欄位絕無中文字元)
   */
  formatList(category, items, customItem = '') {
    const combined = [...items];
    if (customItem && customItem.trim()) {
      combined.push(customItem.trim());
    }

    // 排泄照護：若同時選取「使用尿布」與「使用尿褲」，「使用」不重複
    if (category === 'elimination') {
      const hasDiaper = combined.includes('使用尿布');
      const hasPants = combined.includes('使用尿褲');
      if (hasDiaper && hasPants) {
        const others = combined.filter(i => i !== '使用尿布' && i !== '使用尿褲');
        const zhMerged = '使用尿布、尿褲';
        let transMerged = 'Dùng tã giấy, quần tã';
        if (this.currentLang === 'en') transMerged = 'Adult Diapers, Pull-up Pants';
        else if (this.currentLang === 'id') transMerged = 'Pakai popok, popok celana';
        else if (this.currentLang === 'fil') transMerged = 'Gumagamit ng lampin, pull-up diaper';
        else if (this.currentLang === 'th') transMerged = 'ใช้ผ้าอ้อมผู้ใหญ่, กางเกงผ้าอ้อม';

        const otherTrans = others.map(i => this.lookup(category, i)).filter(t => t && !/[\u4e00-\u9fa5]/.test(t));
        const finalZhItems = [zhMerged, ...others];
        const finalTransItems = [transMerged, ...otherTrans];

        return {
          zh: finalZhItems.join('、'),
          trans: finalTransItems.join(', '),
          itemsZh: finalZhItems,
          itemsTrans: finalTransItems
        };
      }
    }

    const zhText = combined.join('、');
    const transItems = combined
      .map(item => this.lookup(category, item))
      .filter(t => t && !/[\u4e00-\u9fa5]/.test(t));

    return {
      zh: zhText,
      trans: transItems.join(', '),
      itemsZh: combined,
      itemsTrans: transItems
    };
  }
};

if (typeof window !== 'undefined') {
  window.TranslationEngine = TranslationEngine;
}
