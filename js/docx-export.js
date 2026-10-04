/**
 * 個案資料卡產生器 - 真實可編輯 Word (.docx) 匯出引擎 V2.2
 * 依據最新版型規範：
 * 1. 右上角包含隨機照護標語徽章
 * 2. 病史保留最多 3 項主要疾病，雙語內容自動適配版面
 * 3. 綠色標籤標題 + 雙語對稱排版
 * 4. 寬版大頭貼 + 大姓名與性別
 */

const DocxExporter = {
  dataUrlToUint8Array(dataUrl) {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    try {
      const base64 = dataUrl.split(',')[1];
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (e) {
      console.error('DataURL 轉換失敗', e);
      return null;
    }
  },

  createPlaceholderImageBytes() {
    return this.dataUrlToUint8Array(PhotoCropper.getDefaultSilhouette());
  },

  async exportDocx(resident, scaleRatio = 1.0) {
    if (typeof docx === 'undefined') {
      alert('DOCX 匯出模組尚未載入完成，請確認 vendor/docx.iife.js 檔案存在。');
      return;
    }

    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      ImageRun, WidthType, AlignmentType, BorderStyle, ShadingType, PageOrientation
    } = docx;

    const lang = resident.language?.selectedLang || 'vi';
    const isMultiLang = resident.language?.enabled !== false && lang !== 'zh-only';
    TranslationEngine.setLanguage(lang);

    const s = Math.max(0.75, scaleRatio);

    const nameSize = Math.round(56 * s);
    const subNameSize = Math.round(48 * s); /* 越南文姓名加大 2 號（24pt） */
    const titleSize = Math.round(28 * s);
    const bodySize = Math.round(28 * s);
    const transSize = Math.round(24 * s);

    // 寬版大頭貼 (尺寸鎖定不動：240 × 169)
    const photoWidth = 240;
    const photoHeight = 169;

    let photoBytes = this.dataUrlToUint8Array(resident.photo?.src);
    if (!photoBytes) {
      photoBytes = this.createPlaceholderImageBytes();
    }

    const noBorder = {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    };

    const cardBorder = {
      top: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' },
      bottom: { style: BorderStyle.SINGLE, size: 16, color: '81C784' },
      left: { style: BorderStyle.SINGLE, size: 16, color: '81C784' },
      right: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' }
    };

    // 1. Header 表格 (大頭貼 + 姓名/性別 + 右上角粉紅照護標語)
    const photoRun = new ImageRun({
      data: photoBytes,
      transformation: { width: photoWidth, height: photoHeight }
    });

    const genderSymbol = resident.gender === '女' ? ' ♀' : ' ♂';
    const genderColor = resident.gender === '女' ? 'DC2626' : '2563EB';

    const headerTextRuns = [
      new TextRun({
        text: resident.nameZh || '未填寫姓名',
        bold: true,
        size: nameSize,
        font: 'Microsoft JhengHei',
        color: '0F172A'
      }),
      new TextRun({
        text: `   ${genderSymbol}`,
        bold: true,
        size: nameSize,
        font: 'Microsoft JhengHei',
        color: genderColor
      })
    ];

    const parsedMed = TranslationEngine.parseMedicalHistory(resident.medicalHistory?.zh || '');
    const medZh = parsedMed.zhList;
    const medTrans = parsedMed.transList;

    const headerChildren = [
      new Paragraph({ children: headerTextRuns, spacing: { after: 30 } })
    ];

    if (isMultiLang && resident.nameSecondary) {
      headerChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: resident.nameSecondary,
              italics: true,
              bold: true,
              size: subNameSize,
              font: 'Calibri',
              color: 'C05621'
            })
          ],
          spacing: { after: 30 }
        })
      );
    }

    // 頂部大頭照右下方病史段落 (淡綠色主題)
    const medHeaderRuns = [
      new TextRun({
        text: `【 🩺 病史 】`,
        bold: true,
        size: Math.round(20 * s),
        font: 'Microsoft JhengHei',
        color: '166534'
      })
    ];
    if (isMultiLang) {
      const titleTrans = TranslationEngine.category('病史');
      if (titleTrans) {
        medHeaderRuns.push(
          new TextRun({
            text: `   ${titleTrans}`,
            bold: true,
            size: Math.round(17 * s),
            font: 'Calibri',
            color: 'C05621'
          })
        );
      }
    }
    headerChildren.push(
      new Paragraph({
        children: medHeaderRuns,
        shading: { fill: 'F0FDF4', type: ShadingType.CLEAR },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BBF7D0' } },
        spacing: { before: 40, after: 20 }
      })
    );
    // 中文疾病接著後面外語疾病內容 (在同一段落內緊密銜接，合併最多 3 行)
    const zhText = medZh.length > 0 ? medZh.join('、') : '無特殊病史';
    let docxZhSize = 28;
    if (zhText.length > 10) {
      docxZhSize = 24;
    }
    if (medZh.length === 0) docxZhSize = 22;

    const medRuns = [
      new TextRun({
        text: zhText,
        bold: true,
        size: Math.round(docxZhSize * s),
        font: 'Microsoft JhengHei',
        color: medZh.length > 0 ? '0F172A' : '94A3B8'
      })
    ];

    let cleanMedTrans = (medTrans || []).filter(t => t && !/[\u4e00-\u9fa5]/.test(t));
    if (isMultiLang && medZh.length === 0) {
      const defaultTrans = TranslationEngine.lookup('medicalHistory', '無特殊病史') ||
        (TranslationEngine.currentLang === 'en' ? 'No special medical history' : 'Không có tiền sử bệnh đặc biệt');
      cleanMedTrans = [defaultTrans];
    }
    if (isMultiLang && cleanMedTrans.length > 0) {
      const transText = cleanMedTrans.join(', ');
      const docxTransSize = Math.round(25 * s);
      medRuns.push(
        new TextRun({
          text: `  ${transText}`,
          bold: true,
          italics: true,
          size: docxTransSize,
          font: 'Calibri',
          color: medZh.length > 0 ? 'C05621' : '94A3B8'
        })
      );
    }

    headerChildren.push(
      new Paragraph({
        children: medRuns,
        spacing: { after: 20 }
      })
    );

    // 右上角人生名言標籤 (淡粉色底色 + 溫暖楷體字型 + 雙粉色手繪感底線，預設一行大字，超長變兩行)
    const slogan = resident.slogan || { icon: '🌸', text: '心若向陽，歲月安然' };
    const sloganData = typeof formatQuoteLines === 'function'
      ? formatQuoteLines(slogan.text)
      : { isSingleLine: true, lines: [slogan.text] };

    const sloganParagraphs = [];
    if (sloganData.isSingleLine) {
      sloganParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${slogan.icon || '🌸'}  ${sloganData.lines[0]}`,
              bold: true,
              size: Math.round(28 * s),
              font: 'DFKai-SB',
              color: '9F1239',
              underline: { type: 'double', color: 'E11D48' }
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 0 }
        })
      );
    } else {
      const lines = sloganData.lines;
      lines.forEach((line, idx) => {
        const isLast = (idx === lines.length - 1);
        sloganParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: idx === 0 ? `${slogan.icon || '🌸'}  ${line}` : `      ${line}`,
                bold: true,
                size: Math.round(28 * s),
                font: 'DFKai-SB',
                color: '9F1239',
                ...(isLast ? { underline: { type: 'double', color: 'E11D48' } } : {})
              })
            ],
            alignment: AlignmentType.LEFT,
            spacing: { after: isLast ? 0 : 20 }
          })
        );
      });
    }

    const sloganCell = new TableCell({
      width: { size: 5000, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: 'A5D6A7' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'A5D6A7' },
        left: { style: BorderStyle.SINGLE, size: 6, color: 'A5D6A7' },
        right: { style: BorderStyle.SINGLE, size: 6, color: 'A5D6A7' }
      },
      shading: { fill: 'F0FDF4', type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 180, right: 180 },
      children: sloganParagraphs
    });

    const headerTable = new Table({
      width: { size: 15600, type: WidthType.DXA },
      borders: noBorder,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3600, type: WidthType.DXA },
              borders: noBorder,
              children: [new Paragraph({ children: [photoRun], alignment: AlignmentType.CENTER })]
            }),
            new TableCell({
              width: { size: 7000, type: WidthType.DXA },
              borders: noBorder,
              children: headerChildren
            }),
            sloganCell
          ]
        })
      ]
    });

    // 2. 卡片段落建構 (淡綠色標題橫條 + 橙色翻譯)
    const careCardBorder = {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    };

    const buildCareBlockDocx = (icon, titleZh, itemsZh, itemsTrans) => {
      const titleTrans = isMultiLang ? TranslationEngine.category(titleZh) : '';
      const titleRuns = [
        new TextRun({
          text: `【 ${icon} ${titleZh} 】`,
          bold: true,
          size: titleSize,
          font: 'Microsoft JhengHei',
          color: '166534'
        })
      ];
      if (isMultiLang && titleTrans && titleTrans !== titleZh) {
        titleRuns.push(
          new TextRun({
            text: `     ${titleTrans}`,
            bold: true,
            size: Math.round(titleSize * 0.85),
            font: 'Calibri',
            color: 'C05621'
          })
        );
      }

      const paragraphs = [
        new Paragraph({
          children: titleRuns,
          shading: { fill: 'F0FDF4', type: ShadingType.CLEAR },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BBF7D0' } },
          spacing: { before: 80, after: 40 }
        })
      ];

      if (!itemsZh || itemsZh.length === 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: '  (無特殊登錄)', italics: true, size: bodySize, color: '94A3B8' })
            ]
          })
        );
      } else {
        itemsZh.forEach((zh, idx) => {
          const trans = (itemsTrans && itemsTrans[idx]) || '';
          const itemRuns = [
            new TextRun({
              text: `  ● `,
              size: bodySize,
              font: 'Microsoft JhengHei',
              bold: true,
              color: '16A34A'
            }),
            new TextRun({
              text: `${zh}`,
              size: bodySize,
              font: 'Microsoft JhengHei',
              bold: true,
              color: '0F172A'
            })
          ];
          if (isMultiLang && trans && !/[\u4e00-\u9fa5]/.test(trans)) {
            itemRuns.push(
              new TextRun({
                text: `   ● ${trans}`,
                size: transSize,
                font: 'Calibri',
                color: 'C05621'
              })
            );
          }
          paragraphs.push(new Paragraph({ children: itemRuns, spacing: { after: 30 } }));
        });
      }

      return paragraphs;
    };

    const consData = TranslationEngine.formatConsciousness(resident.consciousness?.value, resident.consciousness?.other);
    const consZh = consData.zh ? [consData.zh] : ['清醒'];
    const consTrans = consData.trans ? [consData.trans] : ['Tỉnh táo'];

    const sensoryData = TranslationEngine.formatSensory(
      resident.sensory?.hearing, resident.sensory?.hearingOther,
      resident.sensory?.vision, resident.sensory?.visionOther
    );
    const sensoryZh = sensoryData.itemsZh && sensoryData.itemsZh.length > 0 ? sensoryData.itemsZh : ['聽力：正常', '視力：正常'];
    const sensoryTrans = sensoryData.itemsTrans && sensoryData.itemsTrans.length > 0 ? sensoryData.itemsTrans : ['Thính lực: Bình thường', 'Thị lực: Bình thường'];

    const dietData = TranslationEngine.formatDiet(
      resident.diet?.texture, resident.diet?.textureOther,
      resident.diet?.assistance, resident.diet?.assistanceOther
    );
    const dietZh = [dietData.textureZh, dietData.assistZh];
    const dietTrans = [dietData.textureTrans, dietData.assistTrans];

    const aidsData = TranslationEngine.formatAidsAndTransfer(resident.aids || [], resident.transferAbility, resident.customAid);
    const aidsZh = aidsData.itemsZh && aidsData.itemsZh.length > 0 ? aidsData.itemsZh : (aidsData.zh ? [aidsData.zh] : ['無']);
    const aidsTrans = aidsData.itemsTrans && aidsData.itemsTrans.length > 0 ? aidsData.itemsTrans : (aidsData.trans ? [aidsData.trans] : ['Không có']);

    const elimData = TranslationEngine.formatList('elimination', resident.elimination || [], resident.customElimination);
    const elimZh = elimData.itemsZh.length > 0 ? [elimData.zh] : ['自行如廁'];
    const elimTrans = elimData.itemsTrans.length > 0 ? [elimData.trans] : ['Tự đi vệ sinh'];

    const limitedPrecautions = (resident.precautions || []).slice(0, 3);
    const precData = TranslationEngine.formatList('precautions', limitedPrecautions, resident.customPrecaution);
    const precZh = precData.itemsZh.length > 0 ? precData.itemsZh : ['無特殊注意事項'];
    const precTrans = precData.itemsTrans.length > 0 ? precData.itemsTrans : [''];

    // 左欄 (外表意識、聽力與視力、注意事項)
    const leftChildren = [
      ...createCareCardParagraphs('👁', '外表意識', consZh, consTrans),
      ...createCareCardParagraphs('👂', '聽力與視力', sensoryZh, sensoryTrans),
      ...createCareCardParagraphs('⚠', '注意事項', precZh, precTrans)
    ];

    // 右欄 (飲食、排泄、輔具與移位)
    const rightChildren = [
      ...createCareCardParagraphs('🥣', '飲食', dietZh, dietTrans),
      ...createCareCardParagraphs('🚽', '排泄', elimZh, elimTrans),
      ...createCareCardParagraphs('♿', '輔具與移位', aidsZh, aidsTrans)
    ];

    const bodyTable = new Table({
      width: { size: 15600, type: WidthType.DXA },
      borders: noBorder,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 7600, type: WidthType.DXA },
              borders: cardBorder,
              shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: leftChildren
            }),
            new TableCell({ width: { size: 400, type: WidthType.DXA }, borders: noBorder, children: [new Paragraph({})] }),
            new TableCell({
              width: { size: 7600, type: WidthType.DXA },
              borders: cardBorder,
              shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: rightChildren
            })
          ]
        })
      ]
    });

    const doc = new Document({
      title: `個案資料卡_${resident.nameZh || '住民'}`,
      sections: [{
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE, width: 16838, height: 11906 },
            margin: { top: 400, bottom: 400, left: 540, right: 540 }
          }
        },
        children: [headerTable, new Paragraph({ spacing: { after: 100 } }), bodyTable]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `個案資料卡_${(resident.nameZh || '住民').trim()}.docx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

if (typeof window !== 'undefined') {
  window.DocxExporter = DocxExporter;
}
