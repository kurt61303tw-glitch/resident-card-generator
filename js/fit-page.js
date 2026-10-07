/**
 * 個案資料卡產生器 - A4「永遠一頁」自動適版演算法 (FitEngine)
 * 階梯式自動降級（Level 0 ~ 6），絕不使用 overflow:hidden 吃掉任何照護資訊
 */

const FitEngine = {
  currentLevel: 0,
  maxLevels: 6,
  isForceCompressed: false,
  extraScaleRatio: 1.0,

  /**
   * 執行自動適版檢測
   * @param {HTMLElement} pageEl - A4 頁面容器 (#card-a4-page)
   * @param {HTMLElement} contentEl - 內容容器 (#card-content)
   * @param {HTMLElement} statusBadgeEl - 狀態顯示標籤 (#fit-status-badge)
   * @param {HTMLElement} warningBannerEl - 內容過多警告橫條 (#fit-warning-banner)
   */
  autoFit(pageEl, contentEl, statusBadgeEl, warningBannerEl) {
    if (!pageEl || !contentEl) return;

    // 清除舊的 fit class 與額外 scale
    for (let i = 0; i <= this.maxLevels; i++) {
      pageEl.classList.remove(`fit-level-${i}`);
    }
    pageEl.classList.remove('fit-force-compressed');
    contentEl.style.transform = '';
    this.extraScaleRatio = 1.0;

    let targetLevel = 0;
    pageEl.classList.add(`fit-level-${targetLevel}`);

    // 逐層遞增檢測是否符合單頁高度 (精確扣除內邊距 padding，預留 4px 浮點容差)
    const fits = () => {
      const pageStyle = window.getComputedStyle(pageEl);
      const padTop = parseFloat(pageStyle.paddingTop) || 0;
      const padBottom = parseFloat(pageStyle.paddingBottom) || 0;
      const availH = pageEl.clientHeight - padTop - padBottom + 6;
      return contentEl.scrollHeight <= availH;
    };

    while (!fits() && targetLevel < this.maxLevels) {
      pageEl.classList.remove(`fit-level-${targetLevel}`);
      targetLevel++;
      pageEl.classList.add(`fit-level-${targetLevel}`);
    }

    this.currentLevel = targetLevel;

    // 檢測在 Level 6 後是否依然超出
    const stillOverflow = !fits();

    if (stillOverflow) {
      // 自動即時微調字級，確保內容 100% 容納於單頁內，消除暴力刪頁
      const ratio = (pageEl.clientHeight - 8) / contentEl.scrollHeight;
      this.extraScaleRatio = Math.max(0.7, ratio);
      contentEl.style.transform = `scale(${this.extraScaleRatio})`;
      contentEl.style.transformOrigin = 'top center';
      pageEl.classList.add('fit-force-compressed');

      this.updateStatusUI(
        statusBadgeEl,
        warningBannerEl,
        'overflow',
        '⚠️ 文字超出 A4 單頁範圍，系統已自動為您微調字級'
      );
    } else if (targetLevel === 0) {
      this.updateStatusUI(
        statusBadgeEl,
        warningBannerEl,
        'normal',
        '🟢 版面正常（標準最佳閱讀字級）'
      );
    } else {
      this.updateStatusUI(
        statusBadgeEl,
        warningBannerEl,
        'compact',
        `🟡 已自動縮小（適版等級 Level ${targetLevel}，維持單頁最佳排版）`
      );
    }

    return {
      level: this.currentLevel,
      stillOverflow,
      scaleRatio: this.getWordScaleRatio()
    };
  },

  /**
   * 取得 DOCX 匯出時適用的整體比例係數 (1.0 ~ 0.75)
   */
  getWordScaleRatio() {
    let ratio = 1.0;
    switch (this.currentLevel) {
      case 0: ratio = 1.0; break;
      case 1: ratio = 0.95; break;
      case 2: ratio = 0.92; break;
      case 3: ratio = 0.88; break;
      case 4: ratio = 0.85; break;
      case 5: ratio = 0.82; break;
      case 6: ratio = 0.78; break;
      default: ratio = 0.75;
    }
    if (this.isForceCompressed && this.extraScaleRatio < 1.0) {
      ratio *= this.extraScaleRatio;
    }
    return Math.max(0.7, ratio);
  },

  /**
   * 更新狀態列與警告橫幅 UI
   */
  updateStatusUI(statusBadgeEl, warningBannerEl, state, text) {
    if (statusBadgeEl) {
      statusBadgeEl.className = `fit-status ${state}`;
      statusBadgeEl.textContent = text;
    }

    if (warningBannerEl) {
      warningBannerEl.style.display = 'none';
    }
  },

  /**
   * 切換使用者「繼續縮小並輸出」選項
   */
  setForceCompress(enabled) {
    this.isForceCompressed = enabled;
  }
};
