/**
 * 個案資料卡產生器 - 主應用程式邏輯 V2.2 (App JS)
 * 嚴格對齊上傳設計版型：
 * 1. 綠色膠囊標籤 + 雙語對稱排版
 * 2. 病史保留最多 3 項主要疾病；雙語內容自動適配至最多 2 行
 * 3. 右上角照護隨機暖心標語（隨機抽取，亦可點擊切換）
 * 4. 移除出生/年齡/房號，大姓名 + 大性別標識
 */

/**
 * 預設 15 則經典人生道理名言庫 (扣 5 個字數保守機制：約 8 字，預設一行完成，超長自動變兩行)
 */
const DEFAULT_LIFE_QUOTES = [
  { id: 'q1', icon: '🌸', text: '心若向陽，歲月安然' },
  { id: 'q2', icon: '🍵', text: '靜心以對，淡然從容' },
  { id: 'q3', icon: '🤲', text: '凡事看淡，平安是福' },
  { id: 'q4', icon: '🌿', text: '慢享生活，溫柔美好' },
  { id: 'q5', icon: '☀️', text: '心寬路寬，知足常樂' },
  { id: 'q6', icon: '💖', text: '平凡相伴，最是珍貴' },
  { id: 'q7', icon: '🌻', text: '善待自己，溫柔待人' },
  { id: 'q8', icon: '🕊', text: '歲月靜好，長者常安' },
  { id: 'q9', icon: '🌸', text: '順其自然，隨遇而安' },
  { id: 'q10', icon: '🍀', text: '心懷感恩，便是幸福' },
  { id: 'q11', icon: '🤲', text: '心安身健，就是福氣' },
  { id: 'q12', icon: '🍵', text: '走過四季，心安即歸' },
  { id: 'q13', icon: '☀️', text: '平常心，便是好時節' },
  { id: 'q14', icon: '🌿', text: '從容生活，日日安好' },
  { id: 'q15', icon: '💖', text: '笑容溫暖，照亮身旁' }
];

/**
 * 人生名言詞庫管理器 (支援新增、編輯、刪除、本機記憶儲存)
 */
const QuoteManager = {
  storageKey: 'resident_card_life_quotes_v5',
  quotes: [],

  init() {
    this.quotes = this.loadQuotes();
    this.renderSelectDropdown();
    this.renderModalList();
  },

  loadQuotes() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('載入名言詞庫失敗，使用預設值', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_LIFE_QUOTES));
  },

  saveQuotes() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.quotes));
    } catch (e) {
      console.warn('儲存名言詞庫失敗', e);
    }
  },

  getRandomQuote() {
    if (!this.quotes || this.quotes.length === 0) {
      return DEFAULT_LIFE_QUOTES[0];
    }
    const idx = Math.floor(Math.random() * this.quotes.length);
    return this.quotes[idx];
  },

  cycleNextQuote() {
    if (!this.quotes || this.quotes.length === 0) return;
    const curText = resident.slogan ? resident.slogan.text : '';
    let curIdx = this.quotes.findIndex(q => q.text === curText);
    let nextIdx = (curIdx + 1) % this.quotes.length;
    resident.slogan = this.quotes[nextIdx];
    this.syncSelectValue();
    this.renderModalList();
    renderCardPreview();
  },

  setQuoteByIndex(idx) {
    if (this.quotes[idx]) {
      resident.slogan = this.quotes[idx];
      this.syncSelectValue();
      this.renderModalList();
      renderCardPreview();
    }
  },

  addQuote(icon, text) {
    let cleanText = (text || '').trim();
    if (!cleanText) {
      alert('請輸入名言內容！');
      return false;
    }
    if (cleanText.length > 15) {
      cleanText = cleanText.slice(0, 15);
    }
    const newQuote = {
      id: 'q_' + Date.now(),
      icon: icon || '☘',
      text: cleanText
    };
    this.quotes.unshift(newQuote);
    this.saveQuotes();
    resident.slogan = newQuote;
    this.renderSelectDropdown();
    this.renderModalList();
    renderCardPreview();
    return true;
  },

  updateQuote(id, newIcon, newText) {
    const quote = this.quotes.find(q => q.id === id);
    if (!quote) return;
    let clean = (newText || '').trim();
    if (clean.length > 15) {
      clean = clean.slice(0, 15);
    }
    quote.icon = newIcon;
    quote.text = clean;
    this.saveQuotes();
    if (resident.slogan && resident.slogan.id === id) {
      resident.slogan = quote;
    }
    this.renderSelectDropdown();
    this.renderModalList();
    renderCardPreview();
  },

  deleteQuote(id) {
    if (this.quotes.length <= 1) {
      alert('詞庫至少需保留一則名言！');
      return;
    }
    if (!confirm('確定要刪除這則名言嗎？')) return;
    this.quotes = this.quotes.filter(q => q.id !== id);
    this.saveQuotes();
    if (resident.slogan && resident.slogan.id === id) {
      resident.slogan = this.quotes[0];
    }
    this.renderSelectDropdown();
    this.renderModalList();
    renderCardPreview();
  },

  resetToDefaults() {
    if (!confirm('確定要將詞庫恢復為系統預設的 15 則經典名言嗎？')) return;
    this.quotes = JSON.parse(JSON.stringify(DEFAULT_LIFE_QUOTES));
    this.saveQuotes();
    resident.slogan = this.quotes[0];
    this.renderSelectDropdown();
    this.renderModalList();
    renderCardPreview();
  },

  exportQuotes() {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.quotes, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `resident_quotes_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      alert('匯出詞庫失敗：' + e.message);
    }
  },

  importQuotes(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported) && imported.length > 0) {
          this.quotes = imported.map((q, idx) => ({
            id: q.id || ('q_' + Date.now() + '_' + idx),
            icon: q.icon || '☘',
            text: (q.text || '').trim().slice(0, 15)
          })).filter(q => q.text.length > 0);
          this.saveQuotes();
          if (this.quotes.length > 0) resident.slogan = this.quotes[0];
          this.renderSelectDropdown();
          this.renderModalList();
          renderCardPreview();
          alert(`成功匯入 ${this.quotes.length} 則名言詞庫！`);
        } else {
          alert('匯入的 JSON 檔案格式不符合名言詞庫清單！');
        }
      } catch (err) {
        alert('解析 JSON 檔案失敗，請確認檔案格式是否正確。');
      }
    };
    reader.readAsText(file);
  },

  syncSelectValue() {
    const select = document.getElementById('select-card-quote');
    if (select && resident.slogan) {
      const idx = this.quotes.findIndex(q => q.text === resident.slogan.text);
      if (idx !== -1) select.value = idx;
    }
  },

  renderSelectDropdown() {
    const select = document.getElementById('select-card-quote');
    if (!select) return;
    select.innerHTML = this.quotes.map((q, idx) => `
      <option value="${idx}">${q.icon} ${q.text}</option>
    `).join('');
    this.syncSelectValue();
  },

  renderModalList() {
    const container = document.getElementById('quote-list-container');
    if (!container) return;
    const curText = resident.slogan ? resident.slogan.text : '';

    container.innerHTML = this.quotes.map((q, idx) => {
      const isActive = (q.text === curText);
      return `
        <div class="quote-item-card ${isActive ? 'active' : ''}" id="quote-row-${q.id}">
          <div class="quote-item-content">
            <span class="quote-item-icon">${q.icon}</span>
            <span class="quote-item-text" title="${q.text}">${q.text}</span>
          </div>
          <div class="quote-item-actions">
            <button type="button" class="btn-icon-action ${isActive ? 'active-badge' : ''}" data-quote-action="set" data-quote-idx="${idx}">
              ${isActive ? '✓ 使用中' : '使用'}
            </button>
            <button type="button" class="btn-icon-action" data-quote-action="edit" data-quote-id="${q.id}">
              ✏ 編輯
            </button>
            <button type="button" class="btn-icon-action danger" data-quote-action="delete" data-quote-id="${q.id}">
              🗑
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  startEdit(id) {
    const row = document.getElementById(`quote-row-${id}`);
    const quote = this.quotes.find(q => q.id === id);
    if (!row || !quote) return;

    row.innerHTML = `
      <div style="display: flex; gap: 6px; width: 100%; align-items: center;">
        <select id="edit-icon-${id}" class="form-select" style="width: 60px; padding: 4px; font-size: 18px; text-align: center;">
          ${['☘', '🌸', '☀️', '🤲', '🌿', '🍵', '🌻', '🍀', '🕊', '💖'].map(ic => `
            <option value="${ic}" ${ic === quote.icon ? 'selected' : ''}>${ic}</option>
          `).join('')}
        </select>
        <input type="text" id="edit-text-${id}" class="form-input" maxlength="15" value="${quote.text.replace(/"/g, '&quot;')}" style="flex: 1; padding: 4px 8px; font-size: 14px;" />
        <button type="button" class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 13px;" data-quote-action="save-edit" data-quote-id="${id}">儲存</button>
        <button type="button" class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 13px;" data-quote-action="cancel-edit">取消</button>
      </div>
    `;
  },

  saveEdit(id) {
    const iconEl = document.getElementById(`edit-icon-${id}`);
    const textEl = document.getElementById(`edit-text-${id}`);
    if (!iconEl || !textEl) return;
    let newText = textEl.value.trim();
    if (!newText) {
      alert('名言內容不可為空！');
      return;
    }
    if (newText.length > 15) {
      newText = newText.slice(0, 15);
    }
    this.updateQuote(id, iconEl.value, newText);
  }
};

const resident = {
  nameZh: '',
  nameSecondary: '',
  gender: '', // 預設不預選，左側欄位乾淨無預設內容
  photo: { src: '', isPlaceholder: true },
  medicalHistory: { zh: '' },
  consciousness: { value: '', other: '' },
  sensory: {
    hearing: '',
    hearingOther: '',
    vision: '',
    visionOther: ''
  },
  diet: {
    texture: '',
    textureOther: '',
    assistance: '',
    assistanceOther: ''
  },
  aids: [],
  customAid: '',
  transferAbility: '',
  transferAbilityOther: '',
  elimination: [],
  customElimination: '',
  precautions: [],
  customPrecaution: '',
  language: {
    enabled: true,
    selectedLang: 'vi' // vi | id | fil | th | zh-only
  },
  slogan: null // 當前名言
};

let photoCropperInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  QuoteManager.init();
  resident.slogan = QuoteManager.getRandomQuote();
  QuoteManager.syncSelectValue();
  initPhotoCropper();
  initFormElements();
  bindFormEvents();
  bindActionButtons();
  initGuideDialog();
  clearFormData(); // 確保開局左側欄位 100% 清空無預設勾選/選取項目
  window.addEventListener('resize', updatePreviewScale);
});

function initGuideDialog() {
  const guideOpenBtn = document.getElementById('guideOpenBtn');
  const guideDialog = document.getElementById('guideDialog');
  const guideCloseBtn = document.getElementById('guideCloseBtn');

  function openGuide() {
    if (!guideDialog) return;
    try {
      if (!guideDialog.open) guideDialog.showModal();
    } catch(e) {
      guideDialog.setAttribute('open', '');
    }
  }

  function closeGuide() {
    if (!guideDialog) return;
    try {
      if (guideDialog.open) guideDialog.close();
    } catch(e) {
      guideDialog.removeAttribute('open');
    }
  }

  guideOpenBtn?.addEventListener('click', openGuide);
  guideCloseBtn?.addEventListener('click', closeGuide);
  guideDialog?.addEventListener('click', (e) => {
    if (e.target === guideDialog) closeGuide();
  });
}


function initPhotoCropper() {
  const btnEditPhoto = document.getElementById('btn-edit-photo');

  photoCropperInstance = new PhotoCropper({
    aspectRatio: 334 / 254,
    outputWidth: 668,
    outputHeight: 508,
    onCropComplete: (dataUrl) => {
      resident.photo.src = dataUrl;
      resident.photo.isPlaceholder = false;
      const thumb = document.getElementById('photo-thumb-img');
      if (thumb) thumb.src = dataUrl;
      if (btnEditPhoto) btnEditPhoto.style.display = 'inline-flex';
      renderCardPreview();
    }
  });
  window.photoCropperInstance = photoCropperInstance;

  if (btnEditPhoto) {
    btnEditPhoto.addEventListener('click', () => {
      if (photoCropperInstance) {
        photoCropperInstance.openForEdit();
      }
    });
  }

  const defaultPlaceholder = PhotoCropper.getDefaultSilhouette();
  resident.photo.src = defaultPlaceholder;
  resident.photo.isPlaceholder = true;
  const thumb = document.getElementById('photo-thumb-img');
  if (thumb) thumb.src = defaultPlaceholder;
}

function initFormElements() {
  TranslationEngine.init();
  TranslationEngine.setLanguage(resident.language.selectedLang);
  TranslationEngine.onTranslationReady = () => {
    renderCardPreview();
  };
}

function bindFormEvents() {
  // 0. 照護第二語言下拉選單切換 (置頂優先連動)
  const selectLang = document.getElementById('select-language-mode');
  const inputNameSec = document.getElementById('input-name-secondary');
  const nameSecondaryHint = document.getElementById('name-secondary-hint');
  let nameSecManuallyEdited = false;

  // 人名不使用一般語意翻譯：它可能把姓名誤翻成「狀態不明」等普通句子。
  // 僅接受本機字典提供的完整音譯；缺字或結果不可靠時維持空白讓使用者確認。
  const isPlausibleNameTransliteration = (value) => {
    const candidate = String(value || '').trim();
    if (candidate.length < 2 || candidate.length > 64 || /[\u4e00-\u9fff]/.test(candidate)) return false;
    if (/tình\s*trạng|lấp\s*lửng|không\s*rõ|chưa\s*rõ|not\s*(provided|available|known)|unknown|status|待確認|未提供/i.test(candidate)) return false;
    const permitted = candidate.replace(/[\p{L}\p{M}'’\-.,\s]/gu, '');
    return permitted.length === 0 && /\p{L}/u.test(candidate);
  };
  const setNameSecondaryHint = (message = '') => {
    if (!nameSecondaryHint) return;
    nameSecondaryHint.textContent = message;
    nameSecondaryHint.hidden = !message;
  };

  const updateSecondaryNameTranslation = (nameZh) => {
    if (window._isAiApplying) return; // AI 套用過程中不進行競爭覆蓋
    const lang = resident.language.selectedLang;
    if (!nameZh || !nameZh.trim() || lang === 'zh-only') {
      if (lang === 'zh-only' && inputNameSec && !nameSecManuallyEdited) {
        inputNameSec.value = '';
        resident.nameSecondary = '';
      }
      return;
    }
    if (nameSecManuallyEdited && inputNameSec?.value) return;

    const trimmed = nameZh.trim();

    // 僅採本機的逐字音譯；不可把人名送往一般翻譯服務做語意猜測。
    if (typeof suggestSecondLanguageName === 'function') {
      const instant = suggestSecondLanguageName(trimmed, lang);
      if (isPlausibleNameTransliteration(instant)) {
        if (inputNameSec && (!nameSecManuallyEdited || !inputNameSec.value)) {
          inputNameSec.value = instant;
          resident.nameSecondary = instant;
          setNameSecondaryHint('');
          renderCardPreview();
        }
        return;
      }
    }

    if (inputNameSec && !nameSecManuallyEdited) {
      if (inputNameSec.value && isPlausibleNameTransliteration(inputNameSec.value)) {
        resident.nameSecondary = inputNameSec.value;
        setNameSecondaryHint('');
        renderCardPreview();
        return;
      }
      inputNameSec.value = '';
      resident.nameSecondary = '';
      setNameSecondaryHint('⚠️ 內建姓名資料庫未完整收錄此姓名，已留白；請手動確認後再填入。');
      renderCardPreview();
    }
  };

  if (selectLang) {
    selectLang.addEventListener('change', (e) => {
      const newLang = e.target.value;
      resident.language.selectedLang = newLang;
      resident.language.enabled = (newLang !== 'zh-only');
      TranslationEngine.setLanguage(newLang);
      if (newLang === 'zh-only') setNameSecondaryHint('');
      triggerAutoTranslate();
      if (resident.nameZh && !nameSecManuallyEdited) {
        updateSecondaryNameTranslation(resident.nameZh);
      }
      renderCardPreview();
    });
  }

  // 輔助防抖自動翻譯自訂中文輸入 (提速至 50ms，大幅提升即時手打反應速度)
  let translateTimer = null;
  const triggerAutoTranslate = () => {
    clearTimeout(translateTimer);
    translateTimer = setTimeout(() => {
      if (resident.medicalHistory.zh) {
        const items = resident.medicalHistory.zh.split(/[\n,，、;；]+/).map(s => s.trim()).filter(Boolean);
        items.forEach(it => TranslationEngine.lookup('medicalHistory', it));
      }
      if (resident.customAid) TranslationEngine.lookup('aids', resident.customAid);
      if (resident.customElimination) TranslationEngine.lookup('elimination', resident.customElimination);
      if (resident.customPrecaution) TranslationEngine.lookup('precautions', resident.customPrecaution);
      if (resident.diet.textureOther) TranslationEngine.lookup('dietTexture', resident.diet.textureOther);
      if (resident.diet.assistanceOther) TranslationEngine.lookup('dietAssistance', resident.diet.assistanceOther);
      if (resident.consciousness.other) TranslationEngine.lookup('consciousness', resident.consciousness.other);
      if (resident.sensory.hearingOther) TranslationEngine.lookup('sensoryHearing', resident.sensory.hearingOther);
      if (resident.sensory.visionOther) TranslationEngine.lookup('sensoryVision', resident.sensory.visionOther);
      if (resident.transferAbilityOther) TranslationEngine.lookup('transferAbility', resident.transferAbilityOther);
    }, 50);
  };

  // 1. 中文姓名與第二語言姓名 (第二語言姓名依照照護第二語言設定自動翻譯帶入)
  const inputNameZh = document.getElementById('input-name-zh');

  // 個案姓名待確認紅色框選 (僅標記紅框，不額外顯示提示文字)
  function updateNameUnconfirmedUI() {
    const el = document.getElementById('input-name-zh');
    if (!el) return;
    const val = el.value.trim();
    const isUnconfirmed = val === '個案姓名待確認' || val.includes('待確認');

    el.classList.toggle('is-unconfirmed', isUnconfirmed);

    const oldTip = document.getElementById('name-unconfirmed-tip');
    if (oldTip) oldTip.remove();
  }
  window.updateNameUnconfirmedUI = updateNameUnconfirmedUI;

  inputNameZh.addEventListener('input', (e) => {
    resident.nameZh = e.target.value.trim();
    updateNameUnconfirmedUI();
    if (resident.nameZh) {
      updateSecondaryNameTranslation(resident.nameZh);
    } else {
      if (!nameSecManuallyEdited && inputNameSec) {
        inputNameSec.value = '';
        resident.nameSecondary = '';
        setNameSecondaryHint('');
      }
    }
    renderCardPreview();
  });
  inputNameZh.addEventListener('change', updateNameUnconfirmedUI);

  window.updateSecondaryNameTranslation = updateSecondaryNameTranslation;

  if (inputNameSec) {
    inputNameSec.addEventListener('input', (e) => {
      if (e.isTrusted) {
        nameSecManuallyEdited = Boolean(e.target.value.trim());
      }
      // 防呆保護：若手動輸入外語姓名，自動過濾掉不小心鍵入的中文「原文」字元
      const cleanVal = e.target.value.replace(/[\u4e00-\u9fa5]/g, '').trim();
      resident.nameSecondary = cleanVal;
      if (cleanVal) setNameSecondaryHint('');
      renderCardPreview();
    });
  }

  // 性別單選
  const genderRadios = document.querySelectorAll('input[name="gender"]');
  genderRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      resident.gender = e.target.value;
      document.querySelectorAll('.gender-radio-btn').forEach(btn => btn.classList.remove('active'));
      e.target.closest('.gender-radio-btn').classList.add('active');
      renderCardPreview();
    });
  });

  // 人生名言下拉選單切換
  const selectCardQuote = document.getElementById('select-card-quote');
  if (selectCardQuote) {
    selectCardQuote.addEventListener('change', (e) => {
      QuoteManager.setQuoteByIndex(parseInt(e.target.value, 10));
    });
  }

  // 隨機換一句按鈕
  const btnQuoteRandom = document.getElementById('btn-quote-random');
  if (btnQuoteRandom) {
    btnQuoteRandom.addEventListener('click', () => {
      QuoteManager.cycleNextQuote();
    });
  }

  // 開啟名言詞庫管理 Modal (鎖定背景防止視窗位移跑掉)
  const btnOpenQuoteModal = document.getElementById('btn-open-quote-modal');
  const quoteModal = document.getElementById('quote-manager-modal');
  const openQuoteModal = () => {
    QuoteManager.renderModalList();
    quoteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  const closeQuoteModal = () => {
    quoteModal.classList.remove('active');
    document.body.style.overflow = '';
  };
  if (btnOpenQuoteModal && quoteModal) {
    btnOpenQuoteModal.addEventListener('click', openQuoteModal);
  }

  // 關閉名言詞庫管理 Modal
  const btnCloseQuoteModal = document.getElementById('btn-close-quote-modal');
  const btnCloseQuoteModalX = document.getElementById('btn-close-quote-modal-x');
  if (btnCloseQuoteModal && quoteModal) {
    btnCloseQuoteModal.addEventListener('click', closeQuoteModal);
  }
  if (btnCloseQuoteModalX && quoteModal) {
    btnCloseQuoteModalX.addEventListener('click', closeQuoteModal);
  }
  quoteModal?.addEventListener('click', (e) => {
    if (e.target === quoteModal) closeQuoteModal();
  });

  // 新增名言按鈕
  const btnAddQuote = document.getElementById('btn-add-quote');
  const inputNewQuoteIcon = document.getElementById('input-new-quote-icon');
  const inputNewQuoteText = document.getElementById('input-new-quote-text');
  if (btnAddQuote && inputNewQuoteText) {
    btnAddQuote.addEventListener('click', () => {
      const icon = inputNewQuoteIcon ? inputNewQuoteIcon.value : '☘';
      const text = inputNewQuoteText.value;
      if (QuoteManager.addQuote(icon, text)) {
        inputNewQuoteText.value = '';
      }
    });

    inputNewQuoteText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const icon = inputNewQuoteIcon ? inputNewQuoteIcon.value : '☘';
        const text = inputNewQuoteText.value;
        if (QuoteManager.addQuote(icon, text)) {
          inputNewQuoteText.value = '';
        }
      }
    });
  }

  // 恢復預設名言按鈕
  const btnResetQuotes = document.getElementById('btn-reset-default-quotes');
  if (btnResetQuotes) {
    btnResetQuotes.addEventListener('click', () => {
      QuoteManager.resetToDefaults();
    });
  }

  // 匯出名言詞庫
  const btnExportQuotes = document.getElementById('btn-export-quotes');
  if (btnExportQuotes) {
    btnExportQuotes.addEventListener('click', () => {
      QuoteManager.exportQuotes();
    });
  }

  // 匯入名言詞庫
  const btnImportQuotes = document.getElementById('btn-import-quotes');
  const quoteImportFile = document.getElementById('quote-import-file');
  if (btnImportQuotes && quoteImportFile) {
    btnImportQuotes.addEventListener('click', () => {
      quoteImportFile.click();
    });
    quoteImportFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        QuoteManager.importQuotes(e.target.files[0]);
        quoteImportFile.value = '';
      }
    });
  }

  // 2. 疾病史 3 個自由填寫欄位與快捷按鈕
  const getMedInputs = () => [
    document.getElementById('input-med-1'),
    document.getElementById('input-med-2'),
    document.getElementById('input-med-3')
  ].filter(Boolean);

  const updateQuickMedButtonsState = () => {
    const inputs = getMedInputs();
    const currentVals = inputs.map(i => i.value.trim()).filter(Boolean);
    document.querySelectorAll('.btn-quick-med').forEach(btn => {
      const medName = btn.getAttribute('data-med');
      if (medName && currentVals.includes(medName)) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  };

  const syncMedicalHistory = () => {
    const inputs = getMedInputs();
    const vals = inputs.map(i => i.value.trim()).filter(Boolean);
    resident.medicalHistory.zh = vals.join('、');
    updateQuickMedButtonsState();
    triggerAutoTranslate();
    renderCardPreview();
  };

  getMedInputs().forEach(inp => {
    inp.addEventListener('input', syncMedicalHistory);
  });

  document.querySelectorAll('.btn-quick-med').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const medName = btn.getAttribute('data-med');
      if (!medName) return;
      const inputs = getMedInputs();

      // 若該項目已註記/選中，再次點擊則取消該項目
      if (btn.classList.contains('selected')) {
        const found = inputs.find(i => i.value.trim() === medName);
        if (found) found.value = '';
        syncMedicalHistory();
        return;
      }

      if (medName === '無特殊病史') {
        if (inputs[0]) inputs[0].value = '無特殊病史';
        if (inputs[1]) inputs[1].value = '';
        if (inputs[2]) inputs[2].value = '';
      } else {
        if (inputs[0] && inputs[0].value.trim() === '無特殊病史') {
          inputs[0].value = '';
        }
        let target = inputs.find(i => !i.value.trim());
        if (target) {
          target.value = medName;
        } else {
          if (inputs[2]) inputs[2].value = medName;
        }
      }
      syncMedicalHistory();
    });
  });

  // 3. 外表意識
  const consRadios = document.querySelectorAll('input[name="consciousness"]');
  const inputConsOther = document.getElementById('input-consciousness-other');
  consRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      resident.consciousness.value = e.target.value;
      if (e.target.value === '其他') {
        inputConsOther.style.display = 'block';
        inputConsOther.focus();
      } else {
        inputConsOther.style.display = 'none';
        resident.consciousness.other = '';
      }
      triggerAutoTranslate();
      renderCardPreview();
    });
  });

  inputConsOther.addEventListener('input', (e) => {
    resident.consciousness.other = e.target.value.trim();
    triggerAutoTranslate();
    renderCardPreview();
  });

  // 3.1 聽力與視力評估 (放在外表意識下方)
  const selectHearing = document.getElementById('select-sensory-hearing');
  const inputHearingOther = document.getElementById('input-sensory-hearing-other');
  if (selectHearing && inputHearingOther) {
    selectHearing.addEventListener('change', (e) => {
      resident.sensory.hearing = e.target.value;
      if (e.target.value === '其他') {
        inputHearingOther.style.display = 'block';
        inputHearingOther.focus();
      } else {
        inputHearingOther.style.display = 'none';
        resident.sensory.hearingOther = '';
      }
      triggerAutoTranslate();
      renderCardPreview();
    });
    inputHearingOther.addEventListener('input', (e) => {
      resident.sensory.hearingOther = e.target.value.trim();
      triggerAutoTranslate();
      renderCardPreview();
    });
  }

  const selectVision = document.getElementById('select-sensory-vision');
  const inputVisionOther = document.getElementById('input-sensory-vision-other');
  if (selectVision && inputVisionOther) {
    selectVision.addEventListener('change', (e) => {
      resident.sensory.vision = e.target.value;
      if (e.target.value === '其他') {
        inputVisionOther.style.display = 'block';
        inputVisionOther.focus();
      } else {
        inputVisionOther.style.display = 'none';
        resident.sensory.visionOther = '';
      }
      triggerAutoTranslate();
      renderCardPreview();
    });
    inputVisionOther.addEventListener('input', (e) => {
      resident.sensory.visionOther = e.target.value.trim();
      triggerAutoTranslate();
      renderCardPreview();
    });
  }

  // 4. 飲食形態與進食協助
  const selectDietTexture = document.getElementById('select-diet-texture');
  const inputDietTextureOther = document.getElementById('input-diet-texture-other');
  selectDietTexture.addEventListener('change', (e) => {
    resident.diet.texture = e.target.value;
    if (e.target.value === '其他') {
      inputDietTextureOther.style.display = 'block';
    } else {
      inputDietTextureOther.style.display = 'none';
      resident.diet.textureOther = '';
    }
    triggerAutoTranslate();
    renderCardPreview();
  });
  inputDietTextureOther.addEventListener('input', (e) => {
    resident.diet.textureOther = e.target.value.trim();
    triggerAutoTranslate();
    renderCardPreview();
  });

  const selectDietAssist = document.getElementById('select-diet-assistance');
  const inputDietAssistOther = document.getElementById('input-diet-assistance-other');
  selectDietAssist.addEventListener('change', (e) => {
    resident.diet.assistance = e.target.value;
    if (e.target.value === '鼻胃管灌食') {
      // 鼻胃管灌食，則是流質飲食
      if (selectDietTexture) {
        selectDietTexture.value = '流質飲食';
        resident.diet.texture = '流質飲食';
        if (inputDietTextureOther) {
          inputDietTextureOther.style.display = 'none';
          resident.diet.textureOther = '';
        }
      }
    }
    if (e.target.value === '其他') {
      inputDietAssistOther.style.display = 'block';
    } else {
      inputDietAssistOther.style.display = 'none';
      resident.diet.assistanceOther = '';
    }
    triggerAutoTranslate();
    renderCardPreview();
  });
  inputDietAssistOther.addEventListener('input', (e) => {
    resident.diet.assistanceOther = e.target.value.trim();
    triggerAutoTranslate();
    renderCardPreview();
  });

  // 5. 輔具與移位
  bindCheckboxGroup('aids-checkbox-group', (checked) => {
    resident.aids = checked;
    renderCardPreview();
  });
  bindInput('input-aid-other', (val) => {
    resident.customAid = val;
    triggerAutoTranslate();
  });

  const selectTransfer = document.getElementById('select-transfer-ability');
  const inputTransferOther = document.getElementById('input-transfer-ability-other');
  if (selectTransfer) {
    selectTransfer.addEventListener('change', (e) => {
      resident.transferAbility = e.target.value;
      if (inputTransferOther) {
        if (e.target.value === '其他') {
          inputTransferOther.style.display = 'block';
          inputTransferOther.focus();
        } else {
          inputTransferOther.style.display = 'none';
          resident.transferAbilityOther = '';
        }
      }
      triggerAutoTranslate();
      renderCardPreview();
    });
  }
  if (inputTransferOther) {
    inputTransferOther.addEventListener('input', (e) => {
      resident.transferAbilityOther = e.target.value.trim();
      triggerAutoTranslate();
      renderCardPreview();
    });
  }

  // 6. 排泄照護
  bindCheckboxGroup('elimination-checkbox-group', (checked) => {
    resident.elimination = checked;
    renderCardPreview();
  });
  bindInput('input-elimination-other', (val) => {
    resident.customElimination = val;
    triggerAutoTranslate();
  });

  // 7. 重要注意事項 (嚴格以主要 3 項為限，維護 A4 版面)
  const precBadge = document.getElementById('precaution-count-badge');
  const updatePrecBadge = (count) => {
    if (!precBadge) return;
    precBadge.textContent = `已選 ${count}/3 項`;
    if (count >= 3) {
      precBadge.style.color = '#15803d';
      precBadge.style.background = '#dcfce7';
    } else {
      precBadge.style.color = '#475569';
      precBadge.style.background = '#f1f5f9';
    }
  };

  bindCheckboxGroup('precautions-checkbox-group', (checked) => {
    resident.precautions = checked;
    renderCardPreview();
  }, 3, updatePrecBadge);
  bindInput('input-precaution-other', (val) => {
    resident.customPrecaution = val;
    triggerAutoTranslate();
  });
}

function bindInput(id, callback) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', (e) => {
    callback(e.target.value.trim());
    renderCardPreview();
  });
}

function bindCheckboxGroup(containerId, callback, maxLimit = null, onCountChange = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.addEventListener('change', (e) => {
    const checkedBoxes = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
    if (maxLimit && checkedBoxes.length > maxLimit) {
      if (e && e.target && e.target.checked) {
        e.target.checked = false;
      }
      alert(`照護重點以主要 ${maxLimit} 項為限，以維護 A4 單頁版面最佳排版！`);
      return;
    }
    const checked = [];
    container.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
      checked.push(cb.value);
    });
    if (typeof onCountChange === 'function') {
      onCountChange(checked.length);
    }
    callback(checked);
  });
}

/**
 * 檢查必填欄位：標記未填欄位之特殊背景色，並提供醒目提醒，但不阻擋 PDF 下載
 */
function checkAndHighlightUnfilledFields() {
  // 清除先前的未填醒目註記
  document.querySelectorAll('.field-unfilled-highlight').forEach(el => {
    el.classList.remove('field-unfilled-highlight');
  });

  const missingList = [];

  function registerMissing(name, elementIdOrSelector) {
    missingList.push(name);
    const target = (elementIdOrSelector.startsWith('.') || elementIdOrSelector.startsWith('#'))
      ? document.querySelector(elementIdOrSelector)
      : document.getElementById(elementIdOrSelector);
    if (target) {
      target.classList.add('field-unfilled-highlight');
      // 當使用者輸入或選擇時，立即解除醒目背景色
      const clearFn = () => {
        target.classList.remove('field-unfilled-highlight');
        target.removeEventListener('input', clearFn);
        target.removeEventListener('change', clearFn);
      };
      target.addEventListener('input', clearFn);
      target.addEventListener('change', clearFn);
    }
  }

  // 1. 基本資料
  if (!resident.nameZh || !resident.nameZh.trim() || resident.nameZh === '個案姓名待確認') {
    registerMissing('中文姓名', 'input-name-zh');
  }
  if (!resident.gender) {
    registerMissing('性別', '.gender-radio-group');
  }

  // 2. 照護評估標註 * 項目
  if (!resident.medicalHistory || !resident.medicalHistory.zh || !resident.medicalHistory.zh.trim()) {
    registerMissing('主要疾病', 'med-inputs-container');
  }
  if (!resident.consciousness || !resident.consciousness.value) {
    registerMissing('外表意識', '.consciousness-radio-group');
  }
  if (!resident.sensory || !resident.sensory.hearing) {
    registerMissing('聽力狀態', 'select-sensory-hearing');
  }
  if (!resident.sensory || !resident.sensory.vision) {
    registerMissing('視力狀態', 'select-sensory-vision');
  }
  if (!resident.diet || !resident.diet.texture) {
    registerMissing('飲食形態', 'select-diet-texture');
  }
  if (!resident.diet || !resident.diet.assistance) {
    registerMissing('進食協助方式', 'select-diet-assistance');
  }
  if (!resident.aids || (resident.aids.length === 0 && !resident.customAid)) {
    registerMissing('使用輔具', 'aids-checkbox-group');
  }
  if (!resident.transferAbility) {
    registerMissing('移位能力 / 方式', 'select-transfer-ability');
  }
  if (!resident.elimination || (resident.elimination.length === 0 && !resident.customElimination)) {
    registerMissing('排泄方式', 'elimination-checkbox-group');
  }
  if (!resident.precautions || (resident.precautions.length === 0 && !resident.customPrecaution)) {
    registerMissing('照護重點', 'precautions-checkbox-group');
  }

  // 3. 其他欄位但沒有內容（其他選填、大頭照與自訂說明項目）
  const isDefaultPhoto = !resident.photo?.src || resident.photo.isPlaceholder || resident.photo.src.includes('data:image/svg+xml');
  if (isDefaultPhoto) {
    registerMissing('住民照片（尚未上傳）', '.photo-dropzone');
  }

  const langMode = resident.language?.selectedLang || document.getElementById('select-language-mode')?.value || 'vi';
  if (langMode !== 'zh-only' && (!resident.nameSecondary || !resident.nameSecondary.trim())) {
    registerMissing('第二語言姓名', 'input-name-secondary');
  }

  if (resident.consciousness?.value === '其他' && !document.getElementById('input-consciousness-other')?.value.trim()) {
    registerMissing('外表意識（其他說明）', 'input-consciousness-other');
  }
  if (resident.sensory?.hearing === '其他' && !document.getElementById('input-sensory-hearing-other')?.value.trim()) {
    registerMissing('聽力狀態（其他說明）', 'input-sensory-hearing-other');
  }
  if (resident.sensory?.vision === '其他' && !document.getElementById('input-sensory-vision-other')?.value.trim()) {
    registerMissing('視力狀態（其他說明）', 'input-sensory-vision-other');
  }
  if (resident.diet?.texture === '其他' && !document.getElementById('input-diet-texture-other')?.value.trim()) {
    registerMissing('飲食形態（其他說明）', 'input-diet-texture-other');
  }
  if (resident.diet?.assistance === '其他' && !document.getElementById('input-diet-assistance-other')?.value.trim()) {
    registerMissing('進食協助（其他說明）', 'input-diet-assistance-other');
  }

  return missingList;
}

/**
 * 全面分析左側欄位完成度（含必填與選填、大頭照、自訂說明）
 */
function analyzeAllFormFields() {
  const required = [];
  const optional = [];
  const targetMap = {};

  const registerReq = (label, targetId) => {
    required.push(label);
    targetMap[label] = targetId;
  };
  const registerOpt = (label, targetId) => {
    optional.push(label);
    targetMap[label] = targetId;
  };

  // 1. 中文姓名 (必填)
  if (!resident.nameZh || !resident.nameZh.trim() || resident.nameZh === '個案姓名待確認') {
    registerReq('中文姓名', 'input-name-zh');
  }

  // 2. 性別 (必填)
  if (!resident.gender) {
    registerReq('性別', '.gender-radio-group');
  }

  // 3. 主要疾病 (必填)
  const med1 = document.getElementById('input-med-1')?.value.trim();
  const med2 = document.getElementById('input-med-2')?.value.trim();
  const med3 = document.getElementById('input-med-3')?.value.trim();
  const hasMed = (resident.medicalHistory && resident.medicalHistory.zh && resident.medicalHistory.zh.trim()) || med1 || med2 || med3;
  if (!hasMed) {
    registerReq('主要疾病（至少填寫 1 項）', 'input-med-1');
  }

  // 4. 外表意識 (必填)
  if (!resident.consciousness || !resident.consciousness.value) {
    registerReq('外表意識', '.consciousness-radio-group');
  }

  // 5. 聽力狀態 (必填)
  if (!resident.sensory || !resident.sensory.hearing) {
    registerReq('聽力狀態', 'select-sensory-hearing');
  }

  // 6. 視力狀態 (必填)
  if (!resident.sensory || !resident.sensory.vision) {
    registerReq('視力狀態', 'select-sensory-vision');
  }

  // 7. 飲食形態 (必填)
  if (!resident.diet || !resident.diet.texture) {
    registerReq('飲食形態', 'select-diet-texture');
  }

  // 8. 進食協助方式 (必填)
  if (!resident.diet || !resident.diet.assistance) {
    registerReq('進食協助方式', 'select-diet-assistance');
  }

  // 9. 移位能力 (必填)
  if (!resident.transferAbility) {
    registerReq('移位能力 / 方式', 'select-transfer-ability');
  }

  // 10. 使用輔具 (必填)
  if (!resident.aids || (resident.aids.length === 0 && !resident.customAid)) {
    registerReq('使用輔具', 'aids-checkbox-group');
  }

  // 11. 排泄方式 (必填)
  if (!resident.elimination || (resident.elimination.length === 0 && !resident.customElimination)) {
    registerReq('排泄方式', 'elimination-checkbox-group');
  }

  // 12. 照護重點 / 注意事項 (必填)
  if (!resident.precautions || (resident.precautions.length === 0 && !resident.customPrecaution)) {
    registerReq('照護重點（至少勾選 1 項）', 'precautions-checkbox-group');
  }

  // --- 選填與待確認項目 ---
  // 大頭照 (選填)
  const isDefaultPhoto = !resident.photo?.src || resident.photo.isPlaceholder || resident.photo.src.includes('data:image/svg+xml');
  if (isDefaultPhoto) {
    registerOpt('住民照片 (大頭貼)：尚未上傳照片，目前為預設人像剪影', '.photo-dropzone');
  }

  // 第二語言姓名 (選填)
  const langMode = resident.language?.selectedLang || document.getElementById('select-language-mode')?.value || 'vi';
  if (langMode !== 'zh-only' && (!resident.nameSecondary || !resident.nameSecondary.trim())) {
    registerOpt('第二語言姓名翻譯：雙語模式下尚未填寫外語姓名音譯', 'input-name-secondary');
  }

  // 自訂其他說明檢查
  if (resident.consciousness?.value === '其他' && !document.getElementById('input-consciousness-other')?.value.trim()) {
    registerOpt('意識狀態：選取「其他」但未輸入具體說明', 'input-consciousness-other');
  }
  if (resident.sensory?.hearing === '其他' && !document.getElementById('input-sensory-hearing-other')?.value.trim()) {
    registerOpt('聽力狀態：選取「其他」但未輸入具體說明', 'input-sensory-hearing-other');
  }
  if (resident.sensory?.vision === '其他' && !document.getElementById('input-sensory-vision-other')?.value.trim()) {
    registerOpt('視力狀態：選取「其他」但未輸入具體說明', 'input-sensory-vision-other');
  }
  if (resident.diet?.texture === '其他' && !document.getElementById('input-diet-texture-other')?.value.trim()) {
    registerOpt('飲食形態：選取「其他」但未輸入具體說明', 'input-diet-texture-other');
  }
  if (resident.diet?.assistance === '其他' && !document.getElementById('input-diet-assistance-other')?.value.trim()) {
    registerOpt('進食協助方式：選取「其他」但未輸入具體說明', 'input-diet-assistance-other');
  }

  return { required, optional, targetMap };
}

function showUnfilledFieldsToast(missingList) {
  document.querySelectorAll('.unfilled-toast-banner').forEach(el => el.remove());

  const toast = document.createElement('div');
  toast.id = 'unfilled-export-toast';
  toast.className = 'unfilled-toast-banner';
  toast.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
      <strong style="font-size: 16px; color: #991b1b; display: flex; align-items: center; gap: 6px;">
        <span>⚠️</span> 欄位未填寫提醒（PDF 仍照常下載）
      </strong>
      <button type="button" class="btn-close-toast" style="border: none; background: transparent; font-size: 20px; cursor: pointer; color: #991b1b; line-height: 1;">&times;</button>
    </div>
    <p style="margin: 6px 0 4px; font-size: 14px; color: #7f1d1d;">
      以下標註「*」的必填欄位尚未填寫，已在左側表單以<b>醒目紅色背景</b>標記：
    </p>
    <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; font-weight: 700; color: #b91c1c;">
      ${missingList.map(item => `<li>${item}</li>`).join('')}
    </ul>
    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #fca5a5; font-size: 13px; color: #15803d; font-weight: 700; display: flex; align-items: center; gap: 4px;">
      <span>✓</span> PDF 匯出正在進行中，不受未填欄位限制！
    </div>
  `;

  const closeToastBtn = toast.querySelector('.btn-close-toast');
  if (closeToastBtn) {
    closeToastBtn.addEventListener('click', () => toast.remove());
  }

  document.body.appendChild(toast);

  // 7 秒後自動淡出移除
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 500);
    }
  }, 7000);
}

function bindActionButtons() {
  const executePdfDownload = async () => {
    if (typeof window.PdfExporter !== 'undefined' && typeof window.PdfExporter.ensureRenderReady === 'function') {
      await window.PdfExporter.ensureRenderReady();
    }
    const cardEl = document.getElementById('card-a4-page');
    PdfExporter.downloadDirectPdf(cardEl, resident.nameZh);
  };

  const btnDownloadPdf = document.getElementById('btn-download-pdf');
  if (btnDownloadPdf) {
    btnDownloadPdf.addEventListener('click', async () => {
      const analysis = analyzeAllFormFields();
      const totalMissing = analysis.required.length + analysis.optional.length;

      // 若所有必填與選填皆已完成，直接下載就好！
      if (totalMissing === 0) {
        await executePdfDownload();
        return;
      }

      // 自動檢查未填必填欄位，並加上特殊背景色醒目標記
      checkAndHighlightUnfilledFields();

      // 若有未完成項目，跳出視窗清楚呈現那些尚未完成
      const dialog = document.getElementById('unfilledExportDialog');
      if (dialog) {
        const reqSection = document.getElementById('unfilledRequiredSection');
        const reqCount = document.getElementById('unfilledRequiredCount');
        const reqList = document.getElementById('unfilledRequiredList');
        const optSection = document.getElementById('unfilledOptionalSection');
        const optCount = document.getElementById('unfilledOptionalCount');
        const optList = document.getElementById('unfilledOptionalList');

        if (reqSection && reqList && reqCount) {
          if (analysis.required.length > 0) {
            reqSection.style.display = 'block';
            reqCount.textContent = analysis.required.length;
            reqList.innerHTML = analysis.required.map(item => `<li>${item}</li>`).join('');
          } else {
            reqSection.style.display = 'none';
          }
        }

        if (optSection && optList && optCount) {
          if (analysis.optional.length > 0) {
            optSection.style.display = 'block';
            optCount.textContent = analysis.optional.length;
            optList.innerHTML = analysis.optional.map(item => `<li>${item}</li>`).join('');
          } else {
            optSection.style.display = 'none';
          }
        }

        // 綁定「前往補齊資料」
        const btnGoFix = document.getElementById('btnUnfilledGoFix');
        if (btnGoFix) {
          btnGoFix.onclick = () => {
            dialog.close();
            const firstMissingKey = analysis.required[0] || analysis.optional[0];
            const targetSel = analysis.targetMap[firstMissingKey];
            if (targetSel) {
              const targetEl = targetSel.startsWith('.') ? document.querySelector(targetSel) : document.getElementById(targetSel);
              if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (typeof targetEl.focus === 'function') targetEl.focus();
              }
            }
          };
        }

        // 綁定「確認資料，直接下載 PDF」
        const btnProceed = document.getElementById('btnUnfilledProceedDownload');
        if (btnProceed) {
          btnProceed.onclick = async () => {
            dialog.close();
            await executePdfDownload();
          };
        }

        // 綁定關閉 X
        const closeX = document.getElementById('unfilledExportCloseX');
        if (closeX) {
          closeX.onclick = () => dialog.close();
        }

        try {
          if (!dialog.open) dialog.showModal();
        } catch {
          dialog.setAttribute('open', '');
        }
      } else {
        await executePdfDownload();
      }
    });
  }

  const btnDownloadPptx = document.getElementById('btn-download-pptx');
  if (btnDownloadPptx) {
    btnDownloadPptx.addEventListener('click', () => {
      const missingList = checkAndHighlightUnfilledFields();
      if (missingList.length > 0) {
        showUnfilledFieldsToast(missingList);
      }
      if (typeof PptxExporter !== 'undefined') {
        PptxExporter.export(resident);
      } else {
        alert('PowerPoint 匯出元件尚未就緒，請重新整理頁面。');
      }
    });
  }

  const handleNewCaseConfirm = () => {
    if (confirm('確定要開新個案並清空所有資料嗎？\n此操作將清除表單輸入、大頭照及已上傳的檔案與分析記錄，讓您乾淨輸入新個案。')) {
      clearFormData();
      if (typeof renderCardPreview === 'function') renderCardPreview();
    }
  };

  const btnClear = document.getElementById('btn-clear-form');
  if (btnClear) {
    btnClear.addEventListener('click', handleNewCaseConfirm);
  }

  const btnAiNewCase = document.getElementById('btn-ai-new-case');
  if (btnAiNewCase) {
    btnAiNewCase.addEventListener('click', handleNewCaseConfirm);
  }

  const btnForceCompress = document.getElementById('btn-force-compress');
  if (btnForceCompress) {
    btnForceCompress.addEventListener('click', () => {
      FitEngine.setForceCompress(true);
      renderCardPreview();
    });
  }

  const btnBackEdit = document.getElementById('btn-back-edit');
  if (btnBackEdit) {
    btnBackEdit.addEventListener('click', () => {
      document.querySelector('.form-column').scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 聯網翻譯控制開關 (疾病史未收錄特殊詞彙自動聯網翻譯，預設開啟)
  const onlineTransCheckbox = document.getElementById('checkbox-enable-online-translation');
  if (onlineTransCheckbox) {
    onlineTransCheckbox.checked = true;
    TranslationEngine.allowOnlineTranslation = true;
    onlineTransCheckbox.addEventListener('change', (e) => {
      TranslationEngine.allowOnlineTranslation = e.target.checked;
      if (typeof renderCardPreview === 'function') renderCardPreview();
    });
  }

  // Quote Manager 事件委派：避免 inline onclick
  const quoteListContainer = document.getElementById('quote-list-container');
  if (quoteListContainer) {
    quoteListContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-quote-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-quote-action');
      if (action === 'set') {
        const idx = parseInt(btn.getAttribute('data-quote-idx'), 10);
        QuoteManager.setQuoteByIndex(idx);
      } else if (action === 'edit') {
        const id = btn.getAttribute('data-quote-id');
        QuoteManager.startEdit(id);
      } else if (action === 'delete') {
        const id = btn.getAttribute('data-quote-id');
        QuoteManager.deleteQuote(id);
      } else if (action === 'save-edit') {
        const id = btn.getAttribute('data-quote-id');
        QuoteManager.saveEdit(id);
      } else if (action === 'cancel-edit') {
        QuoteManager.renderModalList();
      }
    });
  }

  // Slogan bubble 切換委派
  document.addEventListener('click', (e) => {
    if (e.target.closest('.slogan-bubble')) {
      QuoteManager.cycleNextQuote();
    }
  });
}

// 頁面超出單頁時之橫幅提醒（絕不靜默截斷或刪除第 2 頁）
window.showPageOverflowToast = function(totalPages) {
  let toast = document.getElementById('page-overflow-toast');
  if (toast) toast.remove();
  toast = document.createElement('div');
  toast.id = 'page-overflow-toast';
  toast.className = 'unfilled-toast-banner';
  toast.style.borderColor = '#f59e0b';
  toast.style.background = '#fffbeb';
  toast.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
      <strong style="font-size: 16px; color: #b45309; display: flex; align-items: center; gap: 6px;">
        <span>⚠️</span> 頁面超出單頁提醒（共 ${totalPages} 頁，已保留所有頁面）
      </strong>
      <button type="button" class="btn-close-overflow-toast" style="border: none; background: transparent; font-size: 20px; cursor: pointer; color: #b45309; line-height: 1;">&times;</button>
    </div>
    <p style="margin: 6px 0 4px; font-size: 14px; color: #92400e;">
      資料卡內容超出 A4 單頁範圍，系統<strong>已完整為您保留所有頁面輸出，絕不截斷任何資料</strong>！若您希望維持單頁列印效果，建議適度微調字級或縮減病史／注意事項文字。
    </p>
  `;
  const closeBtn = toast.querySelector('.btn-close-overflow-toast');
  if (closeBtn) closeBtn.addEventListener('click', () => toast.remove());
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 8000);
};

function clearFormData() {
  window._isFreshCase = true;
  nameSecManuallyEdited = false;
  document.querySelectorAll('.field-unfilled-highlight').forEach(el => el.classList.remove('field-unfilled-highlight'));
  const existingToast = document.getElementById('unfilled-export-toast');
  if (existingToast) existingToast.remove();

  if (typeof AiAssistant !== 'undefined' && typeof AiAssistant.clear === 'function') {
    AiAssistant.clear();
  }
  const defaultSilhouette = typeof PhotoCropper !== 'undefined' ? PhotoCropper.getDefaultSilhouette() : '';
  const photoThumbImg = document.getElementById('photo-thumb-img');
  if (photoThumbImg && defaultSilhouette) photoThumbImg.src = defaultSilhouette;
  const photoFileInput = document.getElementById('photo-file-input');
  if (photoFileInput) photoFileInput.value = '';
  if (window.photoCropperInstance && typeof window.photoCropperInstance.reset === 'function') {
    window.photoCropperInstance.reset();
  }

  resident.nameZh = '';
  resident.nameSecondary = '';
  resident.gender = '';
  resident.photo.src = PhotoCropper.getDefaultSilhouette();
  resident.photo.isPlaceholder = true;
  resident.medicalHistory.zh = '';
  resident.consciousness.value = '';
  resident.consciousness.other = '';
  resident.diet.texture = '';
  resident.diet.textureOther = '';
  resident.diet.assistance = '';
  resident.diet.assistanceOther = '';
  resident.aids = [];
  resident.customAid = '';
  resident.transferAbility = '';
  resident.transferAbilityOther = '';
  resident.elimination = [];
  resident.customElimination = '';
  resident.precautions = [];
  resident.customPrecaution = '';
  resident.sensory = {
    hearing: '',
    hearingOther: '',
    vision: '',
    visionOther: ''
  };

  document.getElementById('input-name-zh').value = '';
  document.getElementById('input-name-secondary').value = '';
  const secHint = document.getElementById('name-secondary-hint');
  if (secHint) { secHint.textContent = ''; secHint.hidden = true; }
  document.getElementById('aiVerificationDialog')?.close();
  updateNameUnconfirmedUI();
  nameSecManuallyEdited = false;
  ['input-med-1', 'input-med-2', 'input-med-3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('input-consciousness-other').style.display = 'none';
  const inputHearingOther = document.getElementById('input-sensory-hearing-other');
  if (inputHearingOther) {
    inputHearingOther.value = '';
    inputHearingOther.style.display = 'none';
  }
  const selectHearing = document.getElementById('select-sensory-hearing');
  if (selectHearing) selectHearing.value = '';
  const inputVisionOther = document.getElementById('input-sensory-vision-other');
  if (inputVisionOther) {
    inputVisionOther.value = '';
    inputVisionOther.style.display = 'none';
  }
  const selectVision = document.getElementById('select-sensory-vision');
  if (selectVision) selectVision.value = '';
  document.getElementById('input-diet-texture-other').style.display = 'none';
  document.getElementById('input-diet-assistance-other').style.display = 'none';
  document.getElementById('input-aid-other').value = '';
  document.getElementById('input-elimination-other').value = '';
  document.getElementById('input-precaution-other').value = '';

  document.querySelectorAll('input[name="gender"]').forEach(r => r.checked = false);
  document.querySelectorAll('.gender-radio-btn').forEach(btn => btn.classList.remove('active'));

  document.querySelectorAll('input[name="consciousness"]').forEach(r => r.checked = false);

  const selDietTex = document.getElementById('select-diet-texture');
  if (selDietTex) selDietTex.value = '';
  const selDietAssist = document.getElementById('select-diet-assistance');
  if (selDietAssist) selDietAssist.value = '';
  const selTransfer = document.getElementById('select-transfer-ability');
  if (selTransfer) selTransfer.value = '';
  const inputTransferOther = document.getElementById('input-transfer-ability-other');
  if (inputTransferOther) { inputTransferOther.value = ''; inputTransferOther.style.display = 'none'; }

  syncCheckboxes('aids-checkbox-group', []);
  syncCheckboxes('elimination-checkbox-group', []);
  syncCheckboxes('precautions-checkbox-group', []);
  const precBadge = document.getElementById('precaution-count-badge');
  if (precBadge) {
    precBadge.textContent = '已選 0/3 項';
    precBadge.style.color = '#475569';
    precBadge.style.background = '#f1f5f9';
  }

  document.querySelectorAll('.btn-quick-med').forEach(btn => btn.classList.remove('selected'));
  const btnEditPhoto = document.getElementById('btn-edit-photo');
  if (btnEditPhoto) btnEditPhoto.style.display = 'none';

  FitEngine.setForceCompress(false);
  renderCardPreview();
}


function syncCheckboxes(containerId, values) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = values.includes(cb.value);
  });
}

/**
 * 建立左右對稱結構之照護卡片 HTML
 */
function buildCareSectionHtml(icon, titleZh, zhItems, transItems, isMultiLang) {
  const categoryTrans = TranslationEngine.category(titleZh);

  // 統一固定字級：各欄位旗下內容與複選項目中文一律固定 28px，絕不依字數大小不一；外語一律統一固定 21px
  const unifiedZhFontSize = '28px';
  const unifiedTransFontSize = '21px';

  const zhRowsHtml = zhItems.map(it => {
    const isSub = it.startsWith('(') || it.startsWith('（') || it.startsWith('__NO_BULLET__');
    const cleanText = it.replace('__NO_BULLET__', '');
    const isPlaceholder = cleanText === '待確認' || cleanText === '無資料' || cleanText === '（待確認）';
    const styleAttr = `style="font-size: ${unifiedZhFontSize}; ${isPlaceholder ? 'color: #94a3b8; font-weight: 500;' : ''}"`;
    return `
      <div class="care-item-zh ${isSub ? 'is-sub-item' : ''}" ${styleAttr}>
        <span class="bullet-dot green" ${isSub || isPlaceholder ? 'style="visibility: hidden;"' : ''}>●</span>
        <span class="item-text">${cleanText}</span>
      </div>
    `;
  }).join('');

  const cleanTransItems = (transItems || []).filter(it => it && !/[\u4e00-\u9fa5]/.test(it));
  const transRowsHtml = isMultiLang ? cleanTransItems.map(it => {
    const isSub = it.startsWith('(') || it.startsWith('（') || it.startsWith('__NO_BULLET__');
    const cleanText = it.replace('__NO_BULLET__', '');
    const isPlaceholder = cleanText === 'Chưa có thông tin' || cleanText === 'No data';
    const transStyleAttr = `style="font-size: ${unifiedTransFontSize}; ${isPlaceholder ? 'color: #cbd5e1; font-weight: 500;' : ''}"`;
    return `
      <div class="care-item-trans ${isSub ? 'is-sub-item' : ''}" ${transStyleAttr}>
        <span class="bullet-dot orange" ${isSub || isPlaceholder ? 'style="visibility: hidden;"' : ''}>●</span>
        <span class="item-text">${cleanText}</span>
      </div>
    `;
  }).join('') : '';

  return `
    <div class="care-block-card">
      <div class="care-block-header">
        <div class="header-badge-green">
          <span class="header-icon">${icon}</span>
          <span class="header-title">${titleZh}</span>
        </div>
        ${isMultiLang && categoryTrans ? `<div class="header-title-orange">${categoryTrans}</div>` : ''}
      </div>
      <div class="care-block-body ${isMultiLang ? 'bilingual-grid' : 'single-col'}">
        <div class="body-col-zh">
          ${zhRowsHtml || '<div class="care-item-zh empty">尚無登錄</div>'}
        </div>
        ${isMultiLang ? `<div class="body-col-trans">${transRowsHtml}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * 建立病史區塊 HTML：最多三項疾病，中文與外語合併內容自動適配至兩行。
 */
function buildHeaderMedHtml(medZhList, medTransList, isMultiLang) {
  const transCategory = isMultiLang ? (TranslationEngine.category('疾病史') || TranslationEngine.category('病史')) : '';

  // 1. 第一行：疾病史標題 (中文淡綠膠囊 + 外語標題，字體規格與其他欄位完全一致)
  const headerHtml = `
    <div class="med-row-header">
      <span class="header-badge-green">
        <span class="header-icon">🩺</span>
        <span>疾病史</span>
      </span>
      ${isMultiLang && transCategory ? `<span class="header-title-orange">${transCategory}</span>` : ''}
    </div>
  `;

  // 2. 疾病史中文與外語合併顯示，由排版演算法嚴格控制在規定行數（最多 2 行），若超過則優先縮小外語字級。
  const hasZh = medZhList && medZhList.length > 0;
  const zhText = hasZh ? medZhList.join('、') : '無特殊病史';

  let transText = '';
  if (isMultiLang) {
    let cleanTransList = (medTransList || []).filter(t => t && !/[\u4e00-\u9fa5]/.test(t));
    if (!hasZh && cleanTransList.length === 0) {
      const defaultTrans = TranslationEngine.lookup('medicalHistory', '無特殊病史') ||
        (TranslationEngine.currentLang === 'en' ? 'No special medical history' : 'Không có tiền sử bệnh đặc biệt');
      cleanTransList = [defaultTrans];
    }
    transText = cleanTransList.join(', ');
  }

  // 疾病外語字體預設 32 號字（32px）
  let transFontSize = '32px';

  const zhStyle = `font-size: 34px; ${!hasZh ? 'color: #64748b; font-weight: 700;' : 'color: #0f172a; font-weight: 900;'}`;
  const transStyle = `font-size: ${transFontSize}; ${!hasZh ? 'color: #94a3b8; font-weight: 600;' : 'color: var(--warm-orange); font-weight: 700;'}`;

  const combinedContentHtml = `
    <div class="med-combined-wrap">
      <div id="card-header-med-combined" class="med-combined-box">
        <span id="card-header-med-zh" class="med-inline-zh" style="${zhStyle}">${zhText}</span>${isMultiLang && transText ? `<span id="card-header-med-trans" class="med-inline-trans" style="${transStyle}">  ${transText}</span>` : ''}
      </div>
    </div>
  `;

  return `
    <div class="card-header-med-box">
      ${headerHtml}
      ${combinedContentHtml}
    </div>
  `;
}


/**
 * 自動縮小文字以確保 100% 保持在單行 (不折行)
 */
function fitSingleLineText(el, defaultMaxFontSize = 68, minFontSize = 14) {
  if (!el) return;
  const parent = el.parentElement;
  if (!parent) return;
  const maxW = parent.clientWidth;
  if (!maxW || maxW <= 0) return;

  let size = defaultMaxFontSize;
  el.style.fontSize = size + 'px';

  if (el.scrollWidth > maxW) {
    const ratio = (maxW - 4) / el.scrollWidth;
    size = Math.max(minFontSize, Math.floor(size * ratio));
    el.style.fontSize = size + 'px';

    while (el.scrollWidth > maxW && size > minFontSize) {
      size -= 1;
      el.style.fontSize = size + 'px';
    }
  }
}

/**
 * 自動縮小文字以確保不超過指定行數（保留供其他區塊使用）
 */
function fitMaxLinesText(el, maxLines = 3, defaultFontSize = 28, minFontSize = 22) {
  if (!el) return;
  let size = defaultFontSize;
  el.style.fontSize = size + 'px';

  while (size > minFontSize) {
    const computed = window.getComputedStyle(el);
    const lh = parseFloat(computed.lineHeight) || (size * 1.25);
    const maxH = Math.ceil(lh * maxLines) + 4;
    if (el.scrollHeight <= maxH) break;
    size -= 1;
    el.style.fontSize = size + 'px';
  }
}

/**
 * 疾病史最多規定行數（預設 2 行）：
 * 若超過規定行數則動態調整字體大小，優先調小外語字級；
 * 僅當外語已縮至最小仍超過行數時，才微調中文字體。
 */
function fitMedHistoryLines(containerEl, maxLines = 2) {
  if (!containerEl) return;
  const zhEl = containerEl.querySelector('#card-header-med-zh');
  const transEl = containerEl.querySelector('#card-header-med-trans');
  if (!zhEl) return;

  // 檢測是否超出規定行數（暫時解除 clamp 獲取精確展開高度）
  const checkExceed = () => {
    const prevClamp = containerEl.style.webkitLineClamp;
    containerEl.style.webkitLineClamp = 'unset';
    const computed = window.getComputedStyle(containerEl);
    const lh = parseFloat(computed.lineHeight) || 35;
    const maxH = Math.ceil(lh * maxLines) + 6;
    const actualH = containerEl.scrollHeight;
    containerEl.style.webkitLineClamp = prevClamp;
    return actualH > maxH;
  };

  // 重設為初始預設標準字級
  zhEl.style.fontSize = '34px';
  if (transEl) transEl.style.fontSize = '32px';

  // 1. 優先調整外語字體大小（從 31px 逐級遞減至 12px）
  if (transEl && checkExceed()) {
    for (let sz = 31; sz >= 12; sz -= 1) {
      transEl.style.fontSize = sz + 'px';
      if (!checkExceed()) break; // 外語縮小後已落入規定行數內，保留中文字級不變
    }
  }

  // 2. 僅在外語已縮至最小（或無外語）仍超出規定行數時，才微調中文（從 33px 逐級遞減至 18px）
  if (checkExceed()) {
    for (let sz = 33; sz >= 18; sz -= 1) {
      zhEl.style.fontSize = sz + 'px';
      if (!checkExceed()) break;
    }
  }
}

/**
 * 人生名言排版 (最多 15 字以內，最多支援三行，緊湊排版確保絕不擠壓或重疊其他文字)：
 */
function formatQuoteLines(text) {
  if (!text) return { isSingleLine: true, lines: [''] };
  let clean = text.trim();
  if (clean.length > 15) {
    clean = clean.slice(0, 15);
  }

  // 若使用者自行換行，則依換行拆分，最多支援 3 行
  if (clean.includes('\n')) {
    const parts = clean.split('\n').map(p => p.trim()).filter(Boolean);
    return { isSingleLine: parts.length === 1, lines: parts.slice(0, 3) };
  }

  // 若含分號
  if (clean.includes('；') || clean.includes(';')) {
    const parts = clean.split(/[；;]/).map(p => p.trim()).filter(Boolean);
    return { isSingleLine: false, lines: parts.slice(0, 3) };
  }
  // 若含逗號（經典名言如「心若向陽，歲月安然」自動依逗號切兩行，精準貼合右上角膠囊，寬度緊湊不擠壓姓名）
  if (clean.includes('，') || clean.includes(',')) {
    const parts = clean.split(/[，,]/).map(p => p.trim()).filter(Boolean);
    return { isSingleLine: false, lines: parts.slice(0, 3) };
  }

  // 無標點：若字數 <= 6，一行完成；若字數 >= 7，自動折為兩行
  if (clean.length <= 6) {
    return { isSingleLine: true, lines: [clean] };
  }

  const mid = Math.ceil(clean.length / 2);
  return { isSingleLine: false, lines: [clean.slice(0, mid), clean.slice(mid)] };
}


function renderCardPreview() {
  const pageEl = document.getElementById('card-a4-page');
  const contentEl = document.getElementById('card-content');
  if (!pageEl || !contentEl) return;

  const isMultiLang = resident.language.enabled && resident.language.selectedLang !== 'zh-only';

  if (isMultiLang) {
    pageEl.classList.remove('second-lang-disabled');
  } else {
    pageEl.classList.add('second-lang-disabled');
  }

  let genderSymbol = '';
  let genderClass = '';
  if (resident.gender === '女') {
    genderSymbol = '♀';
    genderClass = 'card-gender-female';
  } else if (resident.gender === '男') {
    genderSymbol = '♂';
    genderClass = 'card-gender-male';
  }

  const photoSrc = resident.photo.src || PhotoCropper.getDefaultSilhouette();
  const slogan = resident.slogan || DEFAULT_LIFE_QUOTES[0];
  const sloganData = formatQuoteLines(slogan.text);

  // 1. 疾病史：完整解析疾病名稱，由排版演算法嚴格控制在最多 2 行內（優先調小外語字級）
  const parsedMed = TranslationEngine.parseMedicalHistory(resident.medicalHistory.zh);
  const medHeaderHtml = buildHeaderMedHtml(parsedMed.zhList, parsedMed.transList, isMultiLang);

  // 2. 外表意識
  const consHasVal = !!(resident.consciousness && resident.consciousness.value);
  const consData = consHasVal
    ? TranslationEngine.formatConsciousness(resident.consciousness.value, resident.consciousness.other)
    : { zh: '尚無登錄', trans: 'Chưa có thông tin' };
  const consZh = [consData.zh];
  const consTrans = [consData.trans];
  const consCardHtml = buildCareSectionHtml('👁', '外表意識', consZh, consTrans, isMultiLang);

  // 2.1 聽力與視力評估 (放在外表意識下方)
  const hearingHasVal = !!(resident.sensory && resident.sensory.hearing);
  const visionHasVal = !!(resident.sensory && resident.sensory.vision);
  let sensoryZh = [];
  let sensoryTrans = [];
  if (!hearingHasVal && !visionHasVal) {
    sensoryZh = ['尚無登錄'];
    sensoryTrans = ['Chưa có thông tin'];
  } else {
    const sData = TranslationEngine.formatSensory(
      resident.sensory.hearing, resident.sensory.hearingOther,
      resident.sensory.vision, resident.sensory.visionOther
    );
    if (hearingHasVal && visionHasVal) {
      sensoryZh = sData.itemsZh;
      sensoryTrans = sData.itemsTrans;
    } else if (hearingHasVal) {
      sensoryZh = [sData.itemsZh[0]];
      sensoryTrans = [sData.itemsTrans[0]];
    } else {
      sensoryZh = [sData.itemsZh[1]];
      sensoryTrans = [sData.itemsTrans[1]];
    }
  }
  const sensoryCardHtml = buildCareSectionHtml('👂', '聽力與視力', sensoryZh, sensoryTrans, isMultiLang);

  // 3. 飲食形態與進食協助
  const dietTexHasVal = !!(resident.diet && resident.diet.texture);
  const dietAssistHasVal = !!(resident.diet && resident.diet.assistance);
  let dietZh = [];
  let dietTrans = [];
  if (!dietTexHasVal && !dietAssistHasVal) {
    dietZh = ['尚無登錄'];
    dietTrans = ['Chưa có thông tin'];
  } else {
    const dData = TranslationEngine.formatDiet(
      resident.diet.texture, resident.diet.textureOther,
      resident.diet.assistance, resident.diet.assistanceOther
    );
    if (dietTexHasVal && dietAssistHasVal) {
      dietZh = [dData.textureZh, dData.assistZh];
      dietTrans = [dData.textureTrans, dData.assistTrans];
    } else if (dietTexHasVal) {
      dietZh = [dData.textureZh];
      dietTrans = [dData.textureTrans];
    } else {
      dietZh = [dData.assistZh];
      dietTrans = [dData.assistTrans];
    }
  }
  const dietCardHtml = buildCareSectionHtml('🥣', '飲食', dietZh, dietTrans, isMultiLang);

  // 4. 輔具與移位 (移動至右上方第一項)
  const effectiveTransfer = (resident.transferAbility === '其他' && resident.transferAbilityOther)
    ? resident.transferAbilityOther
    : resident.transferAbility;
  const aidsData = TranslationEngine.formatAidsAndTransfer(resident.aids, effectiveTransfer, resident.customAid);
  const hasAids = (resident.aids && resident.aids.length > 0) || resident.customAid || effectiveTransfer;
  const aidsZh = hasAids ? (aidsData.itemsZh && aidsData.itemsZh.length > 0 ? aidsData.itemsZh : [aidsData.zh]) : ['尚無登錄'];
  const aidsTrans = hasAids ? (aidsData.itemsTrans && aidsData.itemsTrans.length > 0 ? aidsData.itemsTrans : [aidsData.trans]) : ['Chưa có thông tin'];
  const aidsCardHtml = buildCareSectionHtml('♿', '輔具與移位', aidsZh, aidsTrans, isMultiLang);

  // 5. 排泄照護 (中文內容不限兩行，依完整項目切行，行尾加「、」，絕不截斷詞彙，並由 FitEngine 維持單頁)
  const elimData = TranslationEngine.formatList('elimination', resident.elimination, resident.customElimination);
  let elimZh = [];
  let elimTrans = [];
  if (elimData.itemsZh.length === 0) {
    elimZh = ['尚無登錄'];
    elimTrans = ['Chưa có thông tin'];
  } else {
    // 依項目完整性貪婪分行：每行最多 6~7 字，超過自然換行，不限行數
    const zhLines = [];
    const transLines = [];

    let currentZhGroup = [];
    let currentTransGroup = [];
    let currentLen = 0;

    for (let i = 0; i < elimData.itemsZh.length; i++) {
      const itZh = elimData.itemsZh[i];
      const itTrans = elimData.itemsTrans[i] || '';
      const itLen = itZh.length + (currentZhGroup.length > 0 ? 1 : 0);

      if (currentZhGroup.length > 0 && (currentLen + itLen > 7)) {
        zhLines.push(currentZhGroup);
        transLines.push(currentTransGroup);
        currentZhGroup = [itZh];
        currentTransGroup = [itTrans];
        currentLen = itZh.length;
      } else {
        currentZhGroup.push(itZh);
        currentTransGroup.push(itTrans);
        currentLen += itLen;
      }
    }
    if (currentZhGroup.length > 0) {
      zhLines.push(currentZhGroup);
      transLines.push(currentTransGroup);
    }

    elimZh = zhLines.map((grp, idx) => {
      const isLastLine = (idx === zhLines.length - 1);
      const lineStr = grp.join('、') + (isLastLine ? '' : '、');
      return (idx === 0) ? lineStr : ('__NO_BULLET__' + lineStr);
    });

    elimTrans = transLines.map((grp, idx) => {
      const isLastLine = (idx === transLines.length - 1);
      const cleanGrp = grp.filter(Boolean);
      const lineStr = cleanGrp.join(', ') + (isLastLine ? '' : ', ');
      return (idx === 0) ? lineStr : ('__NO_BULLET__' + lineStr);
    });
  }
  const elimCardHtml = buildCareSectionHtml('🚽', '排泄', elimZh, elimTrans, isMultiLang);

  // 6. 重要注意事項 (以主要 3 項為限)
  const limitedPrecautions = (resident.precautions || []).slice(0, 3);
  const precData = TranslationEngine.formatList('precautions', limitedPrecautions, resident.customPrecaution);
  const precZh = precData.itemsZh.length > 0 ? precData.itemsZh : ['無特殊注意事項'];
  const precTrans = precData.itemsTrans.length > 0 ? precData.itemsTrans : ['Không có lưu ý đặc biệt'];
  const precCardHtml = buildCareSectionHtml('⚠', '注意事項', precZh, precTrans, isMultiLang);


  // 組合整張 A4 卡片內容
  contentEl.innerHTML = `
    <!-- 頂部 Header -->
    <div class="card-header">
      <div class="card-photo-box">
        <img src="${photoSrc}" alt="住民照片" class="card-photo-img" />
      </div>
      <div class="card-header-content">
        <div class="card-header-top-row">
          <div class="card-identity-box">
            <div class="card-name-row">
              <h2 class="card-resident-name">${resident.nameZh ? resident.nameZh : '<span style="color: #94a3b8; font-weight: 700; font-size: 50px;">請輸入姓名</span>'}</h2>
              <span class="card-gender-badge ${genderClass}">${genderSymbol}</span>
            </div>
            ${isMultiLang && resident.nameSecondary && !/[\u4e00-\u9fa5]/.test(resident.nameSecondary) ? `<div class="card-name-secondary">${resident.nameSecondary}</div>` : ''}
          </div>
          <div class="card-header-right">
            <!-- 最右上角人生名言標籤 (淡粉色主題 + 圓角 + 溫暖手寫感字體 + 雙粉色手繪底線，預設一行大字，超長變兩行) -->
            <div class="slogan-bubble" title="點擊切換人生名言">
              <span class="slogan-icon">${slogan.icon || '🌸'}</span>
              <div class="slogan-text-container ${sloganData.isSingleLine ? 'is-single-line' : 'is-multi-line'}">
                ${sloganData.isSingleLine ? `
                  <div class="slogan-single-line-wrapper">
                    <div class="slogan-line single-line">${sloganData.lines[0]}</div>
                    <svg class="slogan-handdrawn-lines" viewBox="0 0 160 14" preserveAspectRatio="none" aria-hidden="true">
                      <!-- 上層淡粉色主手繪筆觸：微向右上傾斜 -->
                      <path d="M 4,5 C 48,2 108,3 156,5" stroke="#e11d48" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.92" />
                      <!-- 下層隨性筆觸：營造溫馨手繪感 -->
                      <path d="M 16,11 C 62,8 112,8.5 142,11" stroke="#fb7185" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.82" />
                    </svg>
                  </div>
                ` : `
                  <div class="slogan-multi-lines-wrapper" style="display: flex; flex-direction: column; align-items: flex-start; gap: 1px;">
                    ${sloganData.lines.map((line, idx) => {
                      const isLast = (idx === sloganData.lines.length - 1);
                      return `
                        <div class="slogan-line-row ${idx > 0 ? 'offset' : ''}" style="${idx > 0 ? 'margin-left: 8px;' : ''} position: relative;">
                          <div class="slogan-line multi-line">${line}</div>
                          ${isLast ? `
                            <svg class="slogan-handdrawn-lines" viewBox="0 0 160 14" preserveAspectRatio="none" aria-hidden="true">
                              <path d="M 4,5 C 48,2 108,3 156,5" stroke="#e11d48" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.92" />
                              <path d="M 16,11 C 62,8 112,8.5 142,11" stroke="#fb7185" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.82" />
                            </svg>
                          ` : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
        ${medHeaderHtml}
      </div>
    </div>

    <!-- 照護核心資訊雙欄區塊 (綠色膠囊標籤 + 1.5倍大字級，可自由換行) -->
    <div class="card-body-grid">
      <!-- 左欄 (外表意識、聽力與視力、注意事項) -->
      <div class="card-column">
        ${consCardHtml}
        ${sensoryCardHtml}
        ${precCardHtml}
      </div>

      <!-- 右欄 (飲食、排泄、輔具與移位) -->
      <div class="card-column">
        ${dietCardHtml}
        ${elimCardHtml}
        ${aidsCardHtml}
      </div>
    </div>
  `;

  // 姓名單行自適應大字級 (確保姓名與性別符號不擠壓或與人生名言重疊)
  const resNameEl = document.querySelector('.card-resident-name');
  if (resNameEl) {
    fitSingleLineText(resNameEl, 64, 30);
  }

  // 越南文/外語姓名單行自適應大字級（50px；過長時才縮小以維持單行）
  const secNameEl = document.querySelector('.card-name-secondary');
  if (secNameEl) {
    fitSingleLineText(secNameEl, 50, 22);
  }

  // 中文與外語病史字級獨立自適應（中外語完全解耦，外語優先適應微調，中文保證大字級）
  fitMedHistoryLines(document.getElementById('card-header-med-combined'), 2);


  FitEngine.autoFit(
    pageEl,
    contentEl,
    document.getElementById('fit-status-badge'),
    document.getElementById('fit-warning-banner')
  );

  updatePreviewScale();
}

/**
 * 等比例縮放預覽卡片 (與 1123px x 794px PDF 輸出完全一致，完美適配螢幕)
 */
function updatePreviewScale() {
  const wrapper = document.getElementById('card-preview-area');
  const card = document.getElementById('card-a4-page');
  if (!wrapper || !card) return;

  const availWidth = wrapper.clientWidth - 20;
  const baseW = 1123;
  const baseH = 794;
  const scale = Math.min(1.0, Math.max(0.35, availWidth / baseW));

  card.style.transform = `scale(${scale})`;
  card.style.transformOrigin = 'top center';
  const neededHeight = Math.ceil(baseH * scale + 36);
  wrapper.style.height = `${neededHeight}px`;
  wrapper.style.minHeight = `${neededHeight}px`;
}

window.triggerCardRender = renderCardPreview;
window.resident = resident;
window.QuoteManager = QuoteManager;
window.updatePreviewScale = updatePreviewScale;
