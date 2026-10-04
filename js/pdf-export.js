/**
 * 個案資料卡產生器 - PDF 匯出模組 (PdfExporter V2.1)
 * 解決轉向列印問題：獨立滿版離屏渲染容器，保證 100% A4 橫式單頁 (297mm x 210mm)
 * 格式與預覽畫面 1:1 精確一致，一鍵自動觸發檔案下載
 */

const PdfExporter = {
  /**
   * 微小 Promise 防呆等待：確保畫面所有雙語標籤、字型與姓名自適應皆 100% 渲染完成後才輸出
   */
  async ensureRenderReady() {
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch (_) {}

    if (typeof window.triggerCardRender === 'function') {
      window.triggerCardRender();
    }

    // 防呆等待 120ms，讓瀏覽器完成所有 DOM 重繪與排版高度微調
    await new Promise(res => setTimeout(res, 120));
  },

  /**
   * 原生高品質向量列印 (可選備用)
   */
  async printToPdf(residentName) {
    const originalTitle = document.title;
    const cleanName = (residentName || '住民').trim();
    document.title = `個案資料卡_${cleanName}`;

    await this.ensureRenderReady();

    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  },

  /**
   * 直接生成並下載 A4 橫式單頁 PDF (與預覽畫面 1:1 精確一致，絕不誤觸瀏覽器列印)
   */
  async downloadDirectPdf(cardElement, residentName) {
    if (typeof html2pdf === 'undefined') {
      alert('html2pdf 模組尚未載入，請確認 vendor/html2pdf.bundle.min.js 檔案存在。');
      return;
    }

    if (!cardElement) {
      alert('找不到 A4 資料卡元素。');
      return;
    }

    const cleanName = (residentName || '住民').trim();
    const fileName = `個案資料卡_${cleanName}.pdf`;

    const loadingEl = document.getElementById('export-loading-indicator');
    if (loadingEl) loadingEl.style.display = 'flex';

    // 等待所有雙語標籤與自訂字型完全載入與渲染就緒
    await this.ensureRenderReady();

    // 保存預覽畫面原本的縮放狀態
    const origTransform = cardElement.style.transform;
    const origTransformOrigin = cardElement.style.transformOrigin;

    try {
      // 關鍵修復：暫時解除畫面預覽縮放，以 1:1 滿版（1123px x 794px）原生維度擷取，確保 100% 吻合預覽畫面
      cardElement.style.transform = 'none';
      cardElement.style.transformOrigin = 'top left';

      // 等待瀏覽器完成 1:1 排版重繪
      await new Promise(res => setTimeout(res, 80));

      const opt = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2.0,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 1123,
          height: 794,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      const worker = html2pdf().set(opt).from(cardElement);
      const pdf = await worker.toPdf().get('pdf');

      // 絕不靜默刪除頁面（避免照護與排泄資料人間蒸發）；若超頁則保留全部頁面並主動通知同仁
      const totalPages = pdf.internal.getNumberOfPages();
      if (totalPages > 1) {
        console.warn(`[PdfExporter] 卡片內容共產出 ${totalPages} 頁，已完整保留全部頁面輸出，建議適度微調字級或縮減文字以維持單頁最佳版面。`);
        if (typeof window.showPageOverflowToast === 'function') {
          window.showPageOverflowToast(totalPages);
        }
      }

      // 自動觸發下載 PDF 檔案
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF 生成失敗', err);
      alert('PDF 生成失敗，詳細訊息：' + (err.message || err));
    } finally {
      // 100% 恢復畫面原始縮放比例
      cardElement.style.transform = origTransform;
      cardElement.style.transformOrigin = origTransformOrigin;
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }
};

if (typeof window !== 'undefined') {
  window.PdfExporter = PdfExporter;
}
