/**
 * 個案資料卡產生器 - PowerPoint (.pptx) A4 橫式固定絕對座標匯出模組
 * 採用 PptxGenJS，以絕對座標定位，100% 凍結單頁排版，絕不溢頁跑版，可自由編輯文字與更換照片
 */

const PptxExporter = {
  async export(resident) {
    if (typeof PptxGenJS === 'undefined') {
      alert('無法載入 PowerPoint 匯出元件，請確認網路連線或本機檔案是否完整。');
      return;
    }

    const pptx = new PptxGenJS();

    // 1. 定義 A4 橫向尺寸 (297mm × 210mm = 11.693 in × 8.268 in)
    pptx.defineLayout({ name: 'A4_LANDSCAPE', width: 11.69, height: 8.27 });
    pptx.layout = 'A4_LANDSCAPE';

    const slide = pptx.addSlide();

    // 2. 頁面底色與卡片外框 (邊界留白 0.25 in，卡片本體 11.19 × 7.77 in)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.25,
      y: 0.25,
      w: 11.19,
      h: 7.77,
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', width: 1.5 }
    });

    // 卡片底端經典綠色裝飾線條
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.25,
      y: 7.95,
      w: 11.19,
      h: 0.07,
      fill: { color: '81C784' },
      line: { color: '81C784', width: 0 }
    });

    // 3. 住民照片框 (寬 3.48 in, 高 2.65 in，嚴格吻合 334px × 254px 比例)
    const photoX = 0.50;
    const photoY = 0.45;
    const photoW = 3.48;
    const photoH = 2.65;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: photoX,
      y: photoY,
      w: photoW,
      h: photoH,
      rectRadius: 0.12,
      fill: { color: 'F8FAFC' },
      line: { color: 'CBD5E1', width: 1.5 }
    });

    const photoSrc = resident.photo.src || PhotoCropper.getDefaultSilhouette();
    if (photoSrc && photoSrc.startsWith('data:image')) {
      try {
        slide.addImage({
          data: photoSrc,
          x: photoX,
          y: photoY,
          w: photoW,
          h: photoH,
          rounding: true
        });
      } catch (err) {
        console.warn('PPTX photo add error:', err);
      }
    }

    // 4. 頂部 Header 右側區域 (姓名、性別、名言、疾病史)
    const isMultiLang = resident.language.enabled && resident.language.selectedLang !== 'zh-only';
    const isFemale = (resident.gender === '女');
    const genderSymbol = isFemale ? '♀' : '♂';
    const genderColor = isFemale ? 'DB2777' : '2563EB';

    const headerRightX = 4.18;
    const headerRightW = 6.95;

    // 姓名與性別
    const nameZh = resident.nameZh ? resident.nameZh : '請輸入姓名';
    slide.addText([
      { text: nameZh, options: { bold: true, fontSize: 32, color: resident.nameZh ? '0F172A' : '94A3B8', fontFace: 'Microsoft JhengHei' } },
      { text: `  ${genderSymbol}`, options: { bold: true, fontSize: 30, color: genderColor } }
    ], {
      x: headerRightX,
      y: 0.45,
      w: 3.75,
      h: 0.55,
      margin: 0,
      valign: 'middle'
    });

    // 第二語言姓名 (若有)
    if (isMultiLang && resident.nameSecondary) {
      slide.addText(resident.nameSecondary, {
        x: headerRightX,
        y: 1.02,
        w: 3.75,
        h: 0.40,
        fontSize: 18,
        italic: true,
        bold: true,
        color: 'C05621',
        fontFace: 'Arial',
        margin: 0
      });
    }

    // 最右上角人生名言標籤 (放大多4號：20~24pt)
    const slogan = resident.slogan || (typeof QuoteManager !== 'undefined' ? QuoteManager.getCurrentQuote() : { icon: '🌸', text: '平安喜樂，福壽康寧' });
    const sloganText = `${slogan.icon || '🌸'}  ${slogan.text || ''}`;
    let sloganFontSize = 22;
    if (sloganText.length <= 8) {
      sloganFontSize = 24;
    } else if (sloganText.length <= 12) {
      sloganFontSize = 22;
    } else {
      sloganFontSize = 20;
    }

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.05,
      y: 0.42,
      w: 3.10,
      h: 0.56,
      rectRadius: 0.28,
      fill: { color: 'FFF1F2' },
      line: { color: 'FECDD3', width: 1.2 }
    });
    slide.addText(sloganText, {
      x: 8.05,
      y: 0.42,
      w: 3.10,
      h: 0.56,
      fontSize: sloganFontSize,
      bold: true,
      color: '9F1239',
      fontFace: 'Microsoft JhengHei',
      align: 'center',
      valign: 'middle',
      margin: 0
    });

    // 疾病史標題 (淡綠圓角膠囊)
    const transCategory = isMultiLang ? (TranslationEngine.category('疾病史') || TranslationEngine.category('病史') || '') : '';
    slide.addShape(pptx.ShapeType.roundRect, {
      x: headerRightX,
      y: isMultiLang && resident.nameSecondary ? 1.46 : 1.15,
      w: 1.45,
      h: 0.36,
      rectRadius: 0.18,
      fill: { color: 'F0FDF4' },
      line: { color: 'BBF7D0', width: 1.2 }
    });
    slide.addText('🩺 疾病史', {
      x: headerRightX,
      y: isMultiLang && resident.nameSecondary ? 1.46 : 1.15,
      w: 1.45,
      h: 0.36,
      fontSize: 13,
      bold: true,
      color: '166534',
      fontFace: 'Microsoft JhengHei',
      align: 'center',
      valign: 'middle',
      margin: 0
    });

    if (isMultiLang && transCategory) {
      slide.addText(transCategory, {
        x: headerRightX + 1.55,
        y: isMultiLang && resident.nameSecondary ? 1.46 : 1.15,
        w: 2.2,
        h: 0.36,
        fontSize: 13,
        italic: true,
        bold: true,
        color: 'C05621',
        fontFace: 'Arial',
        valign: 'middle',
        margin: 0
      });
    }

    // 疾病史內容：完整保留疾病，外語優先適應微調
    const parsedMed = TranslationEngine.parseMedicalHistory(resident.medicalHistory?.zh || '');
    const medZhList = parsedMed.zhList;
    const medTransList = parsedMed.transList.filter(t => t && !/[\u4e00-\u9fa5]/.test(t));
    const medZh = medZhList.length ? medZhList.join('、') : '無特殊病史';
    let medTrans = '';
    if (isMultiLang) {
      medTrans = medTransList.join(', ') || (medZhList.length === 0
        ? (TranslationEngine.lookup('medicalHistory', '無特殊病史') ||
           (TranslationEngine.currentLang === 'en' ? 'No special medical history' : 'Không có tiền sử bệnh đặc biệt'))
        : '');
    }

    let pptxTransSize = 15;
    if (medTrans.length > 40) {
      pptxTransSize = 12;
    } else if (medTrans.length > 25) {
      pptxTransSize = 13.5;
    }

    const medRuns = [
      { text: medZh, options: { bold: true, fontSize: 16, color: '0F172A', fontFace: 'Microsoft JhengHei' } }
    ];
    if (isMultiLang && medTrans) {
      medRuns.push({ text: `  ${medTrans}`, options: { bold: true, italic: true, fontSize: pptxTransSize, color: 'C05621', fontFace: 'Arial' } });
    }

    slide.addText(medRuns, {
      x: headerRightX,
      y: isMultiLang && resident.nameSecondary ? 1.88 : 1.58,
      w: headerRightW,
      h: 1.35,
      margin: 0,
      valign: 'top',
      lineSpacingMultiple: 1.15
    });

    // 5. 分隔實線
    slide.addShape(pptx.ShapeType.line, {
      x: 0.50,
      y: 3.20,
      w: 10.69,
      h: 0,
      line: { color: 'CBD5E1', width: 1.5 }
    });

    // 6. 雙欄 6 區塊照護資料 (絕對座標定位，永遠不溢位)
    // 左欄 3 區塊：外表意識 (3.35), 聽力與視力 (4.80), 飲食 (6.25)
    // 右欄 3 區塊：輔具與移位 (3.35), 排泄 (4.80), 注意事項 (6.25)
    const colLeftX = 0.50;
    const colRightX = 5.95;
    const blockW = 5.24;
    const blockRowH = 1.35;

    const renderPptxBlock = (icon, titleZh, zhItems, transItems, x, y) => {
      const catTrans = TranslationEngine.category(titleZh) || '';

      // 綠色膠囊標籤
      slide.addShape(pptx.ShapeType.roundRect, {
        x: x,
        y: y,
        w: 1.55,
        h: 0.36,
        rectRadius: 0.18,
        fill: { color: 'F0FDF4' },
        line: { color: 'BBF7D0', width: 1.2 }
      });
      slide.addText(`${icon} ${titleZh}`, {
        x: x,
        y: y,
        w: 1.55,
        h: 0.36,
        fontSize: 13,
        bold: true,
        color: '166534',
        fontFace: 'Microsoft JhengHei',
        align: 'center',
        valign: 'middle',
        margin: 0
      });

      // 外語標籤
      if (isMultiLang && catTrans) {
        slide.addText(catTrans, {
          x: x + 1.68,
          y: y,
          w: blockW - 1.68,
          h: 0.36,
          fontSize: 13,
          italic: true,
          bold: true,
          color: 'C05621',
          fontFace: 'Arial',
          valign: 'middle',
          margin: 0
        });
      }

      // 中文項目列表 (左側)
      const colZhW = isMultiLang ? 2.65 : blockW;
      const zhLines = [];
      zhItems.forEach((it, idx) => {
        const isNoBullet = it.startsWith('__NO_BULLET__') || it.startsWith('(') || it.startsWith('（');
        const cleanText = it.replace('__NO_BULLET__', '');
        const prefix = isNoBullet ? '    ' : '●  ';
        zhLines.push({
          text: `${prefix}${cleanText}`,
          options: { bold: true, fontSize: 13, color: '0F172A', fontFace: 'Microsoft JhengHei', lineSpacingMultiple: 1.15 }
        });
      });

      slide.addText(zhLines, {
        x: x + 0.05,
        y: y + 0.42,
        w: colZhW,
        h: 0.88,
        margin: 0,
        valign: 'top'
      });

      // 外語項目列表 (右側)
      if (isMultiLang) {
        const transLines = [];
        (transItems || []).forEach((it, idx) => {
          const isNoBullet = it.startsWith('__NO_BULLET__') || it.startsWith('(') || it.startsWith('（');
          const cleanText = it.replace('__NO_BULLET__', '');
          const prefix = isNoBullet ? '    ' : '●  ';
          transLines.push({
            text: `${prefix}${cleanText}`,
            options: { bold: true, italic: true, fontSize: 12, color: 'C05621', fontFace: 'Arial', lineSpacingMultiple: 1.15 }
          });
        });

        slide.addText(transLines, {
          x: x + colZhW + 0.15,
          y: y + 0.42,
          w: blockW - colZhW - 0.15,
          h: 0.88,
          margin: 0,
          valign: 'top'
        });
      }
    };

    // 準備各區塊資料
    // 1. 外表意識
    const consData = TranslationEngine.formatConsciousness(resident.consciousness.value, resident.consciousness.other);
    renderPptxBlock('👁', '外表意識', [consData.zh], [consData.trans], colLeftX, 3.35);

    // 2. 聽力與視力
    const hearingVal = (resident.sensory && resident.sensory.hearing) || '';
    const hearingOther = (resident.sensory && resident.sensory.hearingOther) || '';
    const visionVal = (resident.sensory && resident.sensory.vision) || '';
    const visionOther = (resident.sensory && resident.sensory.visionOther) || '';
    const sensoryData = TranslationEngine.formatSensory(hearingVal, hearingOther, visionVal, visionOther);
    renderPptxBlock('👂', '聽力與視力', sensoryData.itemsZh, sensoryData.itemsTrans, colLeftX, 4.80);

    // 3. 注意事項 (移至左欄第 3 項)
    const limitedPrecautions = (resident.precautions || []).slice(0, 3);
    const precData = TranslationEngine.formatList('precautions', limitedPrecautions, resident.customPrecaution);
    const precZh = precData.itemsZh.length > 0 ? precData.itemsZh : ['無特殊注意事項'];
    const precTrans = precData.itemsTrans.length > 0 ? precData.itemsTrans : [''];
    renderPptxBlock('⚠', '注意事項', precZh, precTrans, colLeftX, 6.25);

    // 4. 飲食 (移至右欄第 1 項)
    const dietTex = (resident.diet && resident.diet.texture) || '';
    const dietTexOther = (resident.diet && resident.diet.textureOther) || '';
    const dietAssist = (resident.diet && resident.diet.assistance) || '';
    const dietAssistOther = (resident.diet && resident.diet.assistanceOther) || '';
    const dietData = TranslationEngine.formatDiet(dietTex, dietTexOther, dietAssist, dietAssistOther);
    renderPptxBlock('🥣', '飲食', [dietData.textureZh, dietData.assistZh], [dietData.textureTrans, dietData.assistTrans], colRightX, 3.35);

    // 5. 排泄照護 (優先單行呈現，不用每選一項就換行佔空間；超過 10 字才智慧折行)
    const elimData = TranslationEngine.formatList('elimination', resident.elimination, resident.customElimination);
    let elimZh = [];
    let elimTrans = [];
    if (elimData.itemsZh.length === 0) {
      elimZh = ['尚無登錄'];
      elimTrans = ['Chưa có thông tin'];
    } else {
      let splitIdx = elimData.itemsZh.length;
      let runningLen = 0;
      for (let i = 0; i < elimData.itemsZh.length; i++) {
        const itemLen = elimData.itemsZh[i].length + (i > 0 ? 1 : 0);
        if (i > 0 && (runningLen + itemLen > 10)) {
          splitIdx = i;
          break;
        }
        runningLen += itemLen;
      }

      if (splitIdx >= elimData.itemsZh.length) {
        elimZh = [elimData.itemsZh.join('、')];
        elimTrans = [elimData.itemsTrans.filter(Boolean).join(', ')];
      } else {
        elimZh = [
          elimData.itemsZh.slice(0, splitIdx).join('、') + '、',
          '__NO_BULLET__' + elimData.itemsZh.slice(splitIdx).join('、')
        ];
        elimTrans = [
          elimData.itemsTrans.slice(0, splitIdx).filter(Boolean).join(', ') + ', ',
          '__NO_BULLET__' + elimData.itemsTrans.slice(splitIdx).filter(Boolean).join(', ')
        ];
      }
    }
    renderPptxBlock('🚽', '排泄', elimZh, elimTrans, colRightX, 4.80);

    // 6. 輔具與移位 (移至右欄第 3 項)
    const aidsData = TranslationEngine.formatAidsAndTransfer(resident.aids, resident.transferAbility, resident.customAid);
    const aidsZh = aidsData.itemsZh && aidsData.itemsZh.length > 0 ? aidsData.itemsZh : (aidsData.zh ? [aidsData.zh] : ['無']);
    const aidsTrans = aidsData.itemsTrans && aidsData.itemsTrans.length > 0 ? aidsData.itemsTrans : (aidsData.trans ? [aidsData.trans] : ['Không có']);
    renderPptxBlock('♿', '輔具與移位', aidsZh, aidsTrans, colRightX, 6.25);

    // 區塊水平虛線裝飾 (第 1-2, 2-3 之間)
    [4.65, 6.10].forEach(lineY => {
      slide.addShape(pptx.ShapeType.line, {
        x: colLeftX,
        y: lineY,
        w: blockW,
        h: 0,
        line: { color: 'E2E8F0', width: 1, dashType: 'dash' }
      });
      slide.addShape(pptx.ShapeType.line, {
        x: colRightX,
        y: lineY,
        w: blockW,
        h: 0,
        line: { color: 'E2E8F0', width: 1, dashType: 'dash' }
      });
    });

    // 7. 匯出檔案
    const fileName = `住民資料卡_${resident.nameZh ? resident.nameZh : '未命名'}.pptx`;
    await pptx.writeFile({ fileName });
  }
};

if (typeof window !== 'undefined') {
  window.PptxExporter = PptxExporter;
}
