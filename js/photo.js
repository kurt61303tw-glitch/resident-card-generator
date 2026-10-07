/**
 * 個案資料卡產生器 - Word 經典自由裁切模組 (PhotoCropper V4.0)
 * 真正跟微軟 Word 一模一樣：
 * 1. 拖曳黑角或四邊邊界，直接把多餘、不一樣的邊界刪除掉 (Trim away unwanted edges)
 * 2. 支援拖曳中間平移選取框、全圖選取、設為標準大頭貼比例、旋轉 90°
 * 3. 輸出純淨裁切畫質，100% 絕無黑邊
 * 4. 預設佔位圖「尚未上傳照片」維持 80px 超大粗體醒目
 */

class PhotoCropper {
  constructor(options = {}) {
    this.targetAspect = options.aspectRatio || (334 / 254); // 寬 334px (縮短1cm), 高 254px (增加0.5cm)
    this.outputWidth = options.outputWidth || 668;
    this.outputHeight = options.outputHeight || 508;
    this.onCropComplete = options.onCropComplete || (() => {});

    // 裁切工作畫布尺寸
    this.canvasWidth = 480;
    this.canvasHeight = 365;

    this.currentImage = null;
    this.sourceDataUrl = '';
    this.imageLoadVersion = 0;
    this.baseImgDisplay = null;
    this.imgDisplay = null; // { x, y, width, height } 圖片在畫布上的繪製範圍
    this.crop = null;       // { x, y, width, height } 目前裁切選取框
    this.zoomLevel = 1.0;

    this.isDragging = false;
    this.activeHandle = null; // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right' | 'inside'
    this.startMouse = { x: 0, y: 0 };
    this.startCrop = null;

    this.croppedDataUrl = null;
    this.savedCropNorm = null; // { x, y, w, h } 歸一化裁切選取範圍，確保重新編輯時 100% 還原最後修改樣貌
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.modal = document.getElementById('photo-crop-modal');
    this.canvas = document.getElementById('crop-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    this.btnZoomIn = document.getElementById('btn-crop-zoom-in');
    this.btnZoomOut = document.getElementById('btn-crop-zoom-out');
    this.btnPresetRatio = document.getElementById('btn-crop-preset-ratio');
    this.btnSelectAll = document.getElementById('btn-crop-select-all');
    this.btnRotate = document.getElementById('btn-crop-rotate');
    this.btnConfirm = document.getElementById('btn-crop-confirm');
    this.btnCancel = document.getElementById('btn-crop-cancel');
    this.fileInput = document.getElementById('photo-file-input');
  }

  bindEvents() {
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
    const uploadBtn = document.getElementById('btn-upload-photo');
    if (uploadBtn && this.fileInput) {
      uploadBtn.addEventListener('click', () => this.fileInput.click());
    }

    if (this.btnZoomIn) {
      this.btnZoomIn.addEventListener('click', () => this.zoom(1.15));
    }
    if (this.btnZoomOut) {
      this.btnZoomOut.addEventListener('click', () => this.zoom(0.85));
    }

    if (this.canvas) {
      // 滑鼠互動
      this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
      window.addEventListener('mousemove', (e) => this.onMouseMove(e));
      window.addEventListener('mouseup', () => this.onMouseUp());

      // 觸控互動
      this.canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          this.onMouseDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
        }
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (this.isDragging && e.touches.length === 1) {
          e.preventDefault();
          this.onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
        }
      }, { passive: false });

      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.zoom(e.deltaY < 0 ? 1.08 : 0.92);
      }, { passive: false });

      window.addEventListener('touchend', () => this.onMouseUp());
    }

    if (this.btnPresetRatio) {
      this.btnPresetRatio.addEventListener('click', () => this.presetTargetRatio());
    }
    if (this.btnSelectAll) {
      this.btnSelectAll.addEventListener('click', () => this.selectAll());
    }
    if (this.btnRotate) {
      this.btnRotate.addEventListener('click', () => this.rotate90());
    }
    if (this.btnConfirm) {
      this.btnConfirm.addEventListener('click', () => this.confirmCrop());
    }
    if (this.btnCancel) {
      this.btnCancel.addEventListener('click', () => this.closeModal());
    }
  }

  handleFile(file) {
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      alert('請上傳 JPG、PNG 或 WEBP 格式之圖片檔案。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = String(loadEvt.target.result || '');
      const loadVersion = ++this.imageLoadVersion;
      this.sourceDataUrl = dataUrl;
      this.savedCropNorm = null; // 手動新選取照片時重置裁切座標
      this.currentImage = null;
      const img = new Image();
      img.onload = () => {
        if (loadVersion !== this.imageLoadVersion) return;
        this.currentImage = img;
        this.fitImageToCanvas();

        // ⚡ 立即樂觀套用至卡片與縮圖，使用者選完照片 0 秒瞬時呈現上傳結果！
        try {
          const quickDataUrl = this.getQuickCropDataUrl();
          if (quickDataUrl && typeof this.onCropComplete === 'function') {
            this.onCropComplete(quickDataUrl);
          }
          if (typeof window !== 'undefined') {
            window._isFreshCase = false;
          }
        } catch (err) {
          console.warn('快速套用預覽異常:', err);
        }

        // 開啟微調裁切視窗，使用者可選擇微調或關閉（照片皆已安全套用）
        this.openModal();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  handleFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      this.handleFile(file);
    }
    e.target.value = '';
  }

  getQuickCropDataUrl() {
    if (!this.currentImage) return null;
    const img = this.currentImage;
    const ratio = this.targetAspect; // 334 / 254
    let sw = img.width;
    let sh = img.height;
    let sx = 0;
    let sy = 0;

    if (sw / sh > ratio) {
      sw = Math.round(sh * ratio);
      sx = Math.round((img.width - sw) / 2);
    } else {
      sh = Math.round(sw / ratio);
      sy = Math.round((img.height - sh) / 2);
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = this.outputWidth;
    outCanvas.height = this.outputHeight;
    const outCtx = outCanvas.getContext('2d');
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, this.outputWidth, this.outputHeight);
    outCtx.drawImage(img, sx, sy, sw, sh, 0, 0, this.outputWidth, this.outputHeight);
    return outCanvas.toDataURL('image/jpeg', 0.92);
  }

  openModal() {
    if (this.modal) this.modal.classList.add('active');
    if (this.canvas) {
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;
    }
  }

  closeModal() {
    if (this.modal) this.modal.classList.remove('active');
  }

  /**
   * 記住原始照片與當前最後修改之裁切座標。
   * AI 自動帶入卡片或批次更新時呼叫，使用者日後按「編輯」
   * 一定 100% 回到最後呈現的裁切樣貌，且背景是完整高畫質原圖，可自由微調黑角。
   */
  setSourceDataUrl(dataUrl, cropNorm = null) {
    if (!dataUrl) return;
    const loadVersion = ++this.imageLoadVersion;
    this.sourceDataUrl = dataUrl;
    if (cropNorm) {
      this.savedCropNorm = cropNorm;
    }
    this.currentImage = null;
    this.croppedDataUrl = null;
    const img = new Image();
    img.onload = () => {
      if (loadVersion !== this.imageLoadVersion) return;
      this.currentImage = img;
    };
    img.src = dataUrl;
  }

  setCropNorm(cropNorm) {
    this.savedCropNorm = cropNorm;
  }

  reset() {
    this.currentImage = null;
    this.sourceDataUrl = '';
    this.croppedDataUrl = null;
    this.savedCropNorm = null;
    if (this.fileInput) this.fileInput.value = '';
    const thumb = document.getElementById('photo-thumb-img');
    if (thumb) thumb.src = PhotoCropper.getDefaultSilhouette();
    const editBtn = document.getElementById('btn-edit-photo');
    if (editBtn) editBtn.style.display = 'none';
  }

  loadDataUrl(dataUrl, callback) {
    const loadVersion = ++this.imageLoadVersion;
    this.sourceDataUrl = dataUrl;
    this.currentImage = null;
    const img = new Image();
    img.onload = () => {
      if (loadVersion !== this.imageLoadVersion) return;
      this.currentImage = img;
      this.openModal();
      this.fitImageToCanvas();
      if (callback) callback();
    };
    img.src = dataUrl;
  }

  /**
   * 直接重新編輯已上傳之原圖
   */
  openForEdit() {
    // AI 帶入的預覽可能已裁切；編輯時一律優先載入最後選定的原始照片。
    if (this.sourceDataUrl) {
      this.loadDataUrl(this.sourceDataUrl);
      return true;
    } else if (this.currentImage) {
      this.openModal();
      this.fitImageToCanvas();
      return true;
    } else if (typeof resident !== 'undefined' && resident.photo?.src && !resident.photo?.isPlaceholder) {
      this.loadDataUrl(resident.photo.src);
      return true;
    }
    return false;
  }

  /**
   * 放大與縮小功能 (平滑以選取框中心為基準縮放)
   */
  zoom(factor) {
    if (!this.imgDisplay || !this.baseImgDisplay || !this.crop) return;
    const newZoom = Math.max(0.6, Math.min(4.5, this.zoomLevel * factor));
    if (Math.abs(newZoom - this.zoomLevel) < 0.005) return;

    const cropCenterX = this.crop.x + this.crop.width / 2;
    const cropCenterY = this.crop.y + this.crop.height / 2;

    const scale = newZoom / this.zoomLevel;
    this.zoomLevel = newZoom;

    const newW = Math.round(this.baseImgDisplay.width * this.zoomLevel);
    const newH = Math.round(this.baseImgDisplay.height * this.zoomLevel);

    const newX = Math.round(cropCenterX - (cropCenterX - this.imgDisplay.x) * scale);
    const newY = Math.round(cropCenterY - (cropCenterY - this.imgDisplay.y) * scale);

    this.imgDisplay = { x: newX, y: newY, width: newW, height: newH };
    this.clampCrop();
    this.draw();
  }

  /**
   * 嚴格約束裁切選取框完全落在圖片內部 (四個角絕不跑出外面)
   */
  clampCrop() {
    if (!this.crop || !this.imgDisplay) return;
    const img = this.imgDisplay;
    const minSize = 40;

    let w = this.crop.width;
    let h = this.crop.height;

    // 1. 寬度或高度若超出圖片顯示範圍，以目標長寬比等比例縮小
    if (w > img.width) {
      w = img.width;
      h = Math.round(w / this.targetAspect);
    }
    if (h > img.height) {
      h = img.height;
      w = Math.round(h * this.targetAspect);
    }
    if (w > img.width) {
      w = img.width;
    }

    // 2. 最小尺寸防護
    w = Math.max(minSize, Math.min(img.width, w));
    h = Math.max(Math.round(minSize / this.targetAspect), Math.min(img.height, h));

    // 3. 嚴格鎖定 (x, y) 座標，使四個角 100% 落在圖片內部
    let x = this.crop.x;
    let y = this.crop.y;

    if (x + w > img.x + img.width) {
      x = img.x + img.width - w;
    }
    if (y + h > img.y + img.height) {
      y = img.y + img.height - h;
    }
    if (x < img.x) {
      x = img.x;
    }
    if (y < img.y) {
      y = img.y;
    }

    this.crop = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(w),
      height: Math.round(h)
    };
  }

  /**
   * 依據圖片原始長寬比等比例縮放至畫布內
   */
  fitImageToCanvas() {
    if (!this.currentImage || !this.canvas) return;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const padding = 16;
    const maxW = cw - padding * 2;
    const maxH = ch - padding * 2;

    const imgW = this.currentImage.width;
    const imgH = this.currentImage.height;
    const imgRatio = imgW / imgH;

    let dispW, dispH;
    if (imgW / maxW > imgH / maxH) {
      dispW = maxW;
      dispH = Math.round(maxW / imgRatio);
    } else {
      dispH = maxH;
      dispW = Math.round(maxH * imgRatio);
    }

    const dispX = Math.round((cw - dispW) / 2);
    const dispY = Math.round((ch - dispH) / 2);

    this.baseImgDisplay = { x: dispX, y: dispY, width: dispW, height: dispH };
    this.imgDisplay = { ...this.baseImgDisplay };
    this.zoomLevel = 1.0;

    // 若有已儲存或 AI 裁切好的座標，100% 還原最後修改樣貌；否則預設為標準大頭貼置中比例
    if (this.savedCropNorm) {
      this.applySavedCropNorm();
    } else {
      this.presetTargetRatio();
    }
  }

  /**
   * 100% 還原卡片上最後確認/修改之選取框座標，使編輯畫面與卡片預覽完全一致
   */
  applySavedCropNorm() {
    if (!this.savedCropNorm || !this.imgDisplay) {
      this.presetTargetRatio();
      return;
    }
    const { x: nx, y: ny, w: nw, h: nh } = this.savedCropNorm;
    const ix = this.imgDisplay.x;
    const iy = this.imgDisplay.y;
    const iw = this.imgDisplay.width;
    const ih = this.imgDisplay.height;

    this.crop = {
      x: Math.round(ix + (nx || 0) * iw),
      y: Math.round(iy + (ny || 0) * ih),
      width: Math.max(40, Math.round((nw || 1) * iw)),
      height: Math.max(Math.round(40 / this.targetAspect), Math.round((nh || 1) * ih))
    };
    this.clampCrop();
    this.draw();
  }

  /**
   * 設為大頭貼標準比例 (275:194)
   */
  presetTargetRatio() {
    if (!this.imgDisplay) return;
    const { x: ix, y: iy, width: iw, height: ih } = this.imgDisplay;
    const targetRatio = this.targetAspect; // 334 / 254

    let cw, ch;
    if (iw / ih > targetRatio) {
      ch = Math.round(ih * 0.95);
      cw = Math.round(ch * targetRatio);
      if (cw > iw) {
        cw = iw;
        ch = Math.round(cw / targetRatio);
      }
    } else {
      cw = Math.round(iw * 0.95);
      ch = Math.round(cw / targetRatio);
      if (ch > ih) {
        ch = ih;
        cw = Math.round(ch * targetRatio);
      }
    }

    this.crop = {
      x: Math.round(ix + (iw - cw) / 2),
      y: Math.round(iy + (ih - ch) / 2),
      width: cw,
      height: ch
    };
    this.clampCrop();
    this.draw();
  }

  /**
   * 重設為固定標準比例之最大選取範圍
   */
  selectAll() {
    this.presetTargetRatio();
  }

  /**
   * 旋轉 90 度
   */
  rotate90() {
    if (!this.currentImage) return;
    const off = document.createElement('canvas');
    off.width = this.currentImage.height;
    off.height = this.currentImage.width;
    const ctx = off.getContext('2d');
    ctx.translate(off.width / 2, off.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(this.currentImage, -this.currentImage.width / 2, -this.currentImage.height / 2);

    const rotatedImg = new Image();
    rotatedImg.onload = () => {
      this.currentImage = rotatedImg;
      this.fitImageToCanvas();
    };
    rotatedImg.src = off.toDataURL('image/jpeg', 0.95);
  }

  /**
   * 碰撞檢測：固定格式僅允許 4 個角等比例縮放手柄與框內平移
   */
  getHitHandle(mx, my) {
    if (!this.crop) return null;
    const { x, y, width: w, height: h } = this.crop;
    const r = 20; // 手柄感應半徑

    // 4 個角 (等比例縮放手柄，鎖定長照標準比例固定格式)
    if (Math.abs(mx - x) <= r && Math.abs(my - y) <= r) return 'top-left';
    if (Math.abs(mx - (x + w)) <= r && Math.abs(my - y) <= r) return 'top-right';
    if (Math.abs(mx - x) <= r && Math.abs(my - (y + h)) <= r) return 'bottom-left';
    if (Math.abs(mx - (x + w)) <= r && Math.abs(my - (y + h)) <= r) return 'bottom-right';

    // 內部移動
    if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
      return 'inside';
    }

    return null;
  }

  getCursorForHandle(handle) {
    switch (handle) {
      case 'top-left':
      case 'bottom-right': return 'nwse-resize';
      case 'top-right':
      case 'bottom-left': return 'nesw-resize';
      case 'inside': return 'move';
      default: return 'default';
    }
  }

  onMouseDown(e) {
    if (!this.crop || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width ? this.canvas.width / rect.width : 1;
    const scaleY = rect.height ? this.canvas.height / rect.height : 1;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const handle = this.getHitHandle(mx, my);
    if (!handle) return;

    this.isDragging = true;
    this.activeHandle = handle;
    this.startMouse = { x: mx, y: my };
    this.startCrop = { ...this.crop };
  }

  onMouseMove(e) {
    if (!this.canvas || !this.crop || !this.imgDisplay) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width ? this.canvas.width / rect.width : 1;
    const scaleY = rect.height ? this.canvas.height / rect.height : 1;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (!this.isDragging) {
      const handle = this.getHitHandle(mx, my);
      this.canvas.style.cursor = this.getCursorForHandle(handle);
      return;
    }

    // 正在拖曳：依據所選的邊緣進行縮放或刪除多餘邊界
    const dx = mx - this.startMouse.x;
    const dy = my - this.startMouse.y;
    const sc = this.startCrop;
    const img = this.imgDisplay;

    const minSize = 40;
    let newX = sc.x;
    let newY = sc.y;
    let newW = sc.width;
    let newH = sc.height;

    switch (this.activeHandle) {
      case 'left':
        newX = Math.min(sc.x + sc.width - minSize, Math.max(img.x, sc.x + dx));
        newW = sc.x + sc.width - newX;
        break;
      case 'right':
        newW = Math.max(minSize, Math.min(img.x + img.width - sc.x, sc.width + dx));
        break;
      case 'top':
        newY = Math.min(sc.y + sc.height - minSize, Math.max(img.y, sc.y + dy));
        newH = sc.y + sc.height - newY;
        break;
      case 'bottom':
        newH = Math.max(minSize, Math.min(img.y + img.height - sc.y, sc.height + dy));
        break;
      case 'top-left': {
        const rawW = Math.min(sc.x + sc.width - minSize, Math.max(img.x, sc.x + dx));
        let w = sc.x + sc.width - rawW;
        let h = Math.round(w / this.targetAspect);
        let x = sc.x + sc.width - w;
        let y = sc.y + sc.height - h;
        if (y < img.y) {
          y = img.y;
          h = sc.y + sc.height - y;
          w = Math.round(h * this.targetAspect);
          x = sc.x + sc.width - w;
        }
        if (x < img.x) {
          x = img.x;
          w = sc.x + sc.width - x;
          h = Math.round(w / this.targetAspect);
          y = sc.y + sc.height - h;
        }
        newX = x; newY = y; newW = w; newH = h;
        break;
      }
      case 'top-right': {
        let w = Math.max(minSize, Math.min(img.x + img.width - sc.x, sc.width + dx));
        let h = Math.round(w / this.targetAspect);
        let y = sc.y + sc.height - h;
        if (y < img.y) {
          y = img.y;
          h = sc.y + sc.height - y;
          w = Math.round(h * this.targetAspect);
        }
        if (sc.x + w > img.x + img.width) {
          w = img.x + img.width - sc.x;
          h = Math.round(w / this.targetAspect);
          y = sc.y + sc.height - h;
        }
        newW = w; newH = h; newY = y;
        break;
      }
      case 'bottom-left': {
        const rawW = Math.min(sc.x + sc.width - minSize, Math.max(img.x, sc.x + dx));
        let w = sc.x + sc.width - rawW;
        let h = Math.round(w / this.targetAspect);
        let x = sc.x + sc.width - w;
        if (sc.y + h > img.y + img.height) {
          h = img.y + img.height - sc.y;
          w = Math.round(h * this.targetAspect);
          x = sc.x + sc.width - w;
        }
        if (x < img.x) {
          x = img.x;
          w = sc.x + sc.width - x;
          h = Math.round(w / this.targetAspect);
        }
        newX = x; newW = w; newH = h;
        break;
      }
      case 'bottom-right': {
        let w = Math.max(minSize, Math.min(img.x + img.width - sc.x, sc.width + dx));
        let h = Math.round(w / this.targetAspect);
        if (sc.y + h > img.y + img.height) {
          h = img.y + img.height - sc.y;
          w = Math.round(h * this.targetAspect);
        }
        if (sc.x + w > img.x + img.width) {
          w = img.x + img.width - sc.x;
          h = Math.round(w / this.targetAspect);
        }
        newW = w; newH = h;
        break;
      }
      case 'inside':
        newX = Math.max(img.x, Math.min(img.x + img.width - sc.width, sc.x + dx));
        newY = Math.max(img.y, Math.min(img.y + img.height - sc.height, sc.y + dy));
        break;
    }

    this.crop = {
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH)
    };
    this.clampCrop();
    this.draw();
  }

  onMouseUp() {
    this.isDragging = false;
    this.activeHandle = null;
    if (this.canvas) this.canvas.style.cursor = 'default';
  }

  /**
   * 繪製 Word 模式裁切介面
   */
  draw() {
    if (!this.ctx || !this.currentImage || !this.canvas || !this.imgDisplay || !this.crop) return;
    this.clampCrop();
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const img = this.imgDisplay;
    const crop = this.crop;

    // 1. 底色
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, cw, ch);

    // 2. 繪製原始圖片 (完整展示)
    ctx.drawImage(this.currentImage, img.x, img.y, img.width, img.height);

    // 3. 繪製暗色遮罩 (非裁切區半透明，把不一樣的邊緣視覺遮除)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    // 上
    ctx.fillRect(img.x, img.y, img.width, crop.y - img.y);
    // 下
    ctx.fillRect(img.x, crop.y + crop.height, img.width, (img.y + img.height) - (crop.y + crop.height));
    // 左
    ctx.fillRect(img.x, crop.y, crop.x - img.x, crop.height);
    // 右
    ctx.fillRect(crop.x + crop.width, crop.y, (img.x + img.width) - (crop.x + crop.width), crop.height);

    // 4. 裁切框細框線 (純白細線)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);

    // 5. 繪製 Word 經典黑角與邊條手柄 (4 角 + 4 邊中心)
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    const bx = crop.x;
    const by = crop.y;
    const bw = crop.width;
    const bh = crop.height;
    const cx = bx + bw / 2;
    const cy = by + bh / 2;

    const tick = 22; // 手柄長度
    const thick = 6; // 手柄粗細

    const drawRect = (x, y, w, h) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    };

    // 左上 L 角
    drawRect(bx, by, tick, thick);
    drawRect(bx, by, thick, tick);

    // 右上 L 角
    drawRect(bx + bw - tick, by, tick, thick);
    drawRect(bx + bw - thick, by, thick, tick);

    // 左下 L 角
    drawRect(bx, by + bh - thick, tick, thick);
    drawRect(bx, by + bh - tick, thick, tick);

    // 右下 L 角
    drawRect(bx + bw - tick, by + bh - thick, tick, thick);
    drawRect(bx + bw - thick, by + bh - tick, thick, tick);
  }

  /**
   * 確認裁切：真正將多餘邊界刪除 (裁除不要的邊緣)
   */
  confirmCrop() {
    if (!this.currentImage || !this.imgDisplay || !this.crop) return;

    // 計算在原始高解析圖片上的對應像素座標
    const scaleX = this.currentImage.width / this.imgDisplay.width;
    const scaleY = this.currentImage.height / this.imgDisplay.height;

    const srcX = Math.max(0, Math.round((this.crop.x - this.imgDisplay.x) * scaleX));
    const srcY = Math.max(0, Math.round((this.crop.y - this.imgDisplay.y) * scaleY));
    const srcW = Math.min(this.currentImage.width - srcX, Math.round(this.crop.width * scaleX));
    const srcH = Math.min(this.currentImage.height - srcY, Math.round(this.crop.height * scaleY));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = this.outputWidth;
    outCanvas.height = this.outputHeight;
    const outCtx = outCanvas.getContext('2d');

    // 底色預填暖白，100% 絕無黑邊
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, this.outputWidth, this.outputHeight);

    // 將所選取的區域填滿輸出畫布 (等比適配填滿，徹底排除不要的邊緣)
    const outAspect = this.outputWidth / this.outputHeight;
    const srcAspect = srcW / srcH;

    let drawW, drawH, drawX, drawY;
    if (srcAspect > outAspect) {
      // 裁切區域較寬
      drawH = this.outputHeight;
      drawW = Math.round(this.outputHeight * srcAspect);
      drawX = Math.round((this.outputWidth - drawW) / 2);
      drawY = 0;
    } else {
      // 裁切區域較窄
      drawW = this.outputWidth;
      drawH = Math.round(this.outputWidth / srcAspect);
      drawX = 0;
      drawY = Math.round((this.outputHeight - drawH) / 2);
    }

    outCtx.drawImage(this.currentImage, srcX, srcY, srcW, srcH, drawX, drawY, drawW, drawH);

    // 儲存歸一化裁切座標，保證下次點擊「編輯」時 100% 還原為最後修改的樣貌
    if (this.currentImage && this.currentImage.width && this.currentImage.height) {
      this.savedCropNorm = {
        x: srcX / this.currentImage.width,
        y: srcY / this.currentImage.height,
        w: srcW / this.currentImage.width,
        h: srcH / this.currentImage.height
      };
    }

    this.croppedDataUrl = outCanvas.toDataURL('image/jpeg', 0.95);
    this.closeModal();

    if (typeof this.onCropComplete === 'function') {
      this.onCropComplete(this.croppedDataUrl);
    }
  }

  /**
   * 產生大字清晰之佔位圖 (Base64 JPEG，維持 80px 超大粗體醒目)
   */
  static getDefaultSilhouette() {
    if (PhotoCropper._cachedSilhouette) {
      return PhotoCropper._cachedSilhouette;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 668;
    canvas.height = 508;
    const ctx = canvas.getContext('2d');

    // 柔和溫暖底色
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, 668, 508);

    // 完整上半身人體剪影 (頭部、頸部、肩膀、胸部/軀幹完整延展至畫布底部)
    ctx.fillStyle = '#CBD5E1';

    // 1. 頭部 (微調自然端正比例)
    ctx.beginPath();
    ctx.arc(334, 128, 68, 0, Math.PI * 2);
    ctx.fill();

    // 2. 完整上半身 (含頸部、斜方肌肩膀、胸部與兩側身軀，完整向下延展至底部)
    ctx.beginPath();
    ctx.moveTo(135, 508); // 左側軀幹底端
    // 左側腰胸向上至肩膀外緣
    ctx.bezierCurveTo(140, 395, 155, 315, 205, 275);
    // 左肩向頸部自然斜度
    ctx.bezierCurveTo(240, 248, 275, 226, 305, 208);
    // 左側頸部直連下顎
    ctx.lineTo(308, 188);
    // 下顎頸線弧度
    ctx.quadraticCurveTo(334, 200, 360, 188);
    // 右側頸部
    ctx.lineTo(363, 208);
    // 右肩自然斜度
    ctx.bezierCurveTo(393, 226, 428, 248, 463, 275);
    // 右側肩膀外緣向下延展至右側軀幹底端
    ctx.bezierCurveTo(513, 315, 528, 395, 533, 508);
    ctx.closePath();
    ctx.fill();

    // 3. 底部專屬狀態標籤膠囊 (位於 y: 388 ~ 464，置於下胸位置，端正優雅)
    const text = '尚未上傳照片';
    ctx.font = 'bold 48px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    const textWidth = ctx.measureText(text).width;
    const badgeW = textWidth + 60;
    const badgeH = 76;
    const badgeX = 334 - badgeW / 2;
    const badgeY = 388;
    const radius = 38;

    // 白色圓角膠囊背景與精緻立體陰影
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();
    ctx.restore();

    // 膠囊細邊框
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.stroke();

    // 狀態文字 (居中於膠囊內，清晰大器)
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 334, badgeY + badgeH / 2 + 2);

    PhotoCropper._cachedSilhouette = canvas.toDataURL('image/jpeg', 0.95);
    return PhotoCropper._cachedSilhouette;
  }
}

if (typeof window !== 'undefined') {
  window.PhotoCropper = PhotoCropper;
}
