// 📍 주요 개선 사항들

// 1. 중복된 HEX-RGB 변환 함수들 통합
const ColorUtils = {
  // RGB ↔ HEX 변환
  hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  },

  rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  },

  // HSL 변환 (기존과 동일하지만 통합)
  hexToHsl(hex) {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHsl(r / 255, g / 255, b / 255);
  },

  rgbToHsl(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [h * 360, s * 100, l * 100];
  },

  hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  },

  // 명도 계산 (중복 제거)
  getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  // 대비율 계산
  getContrast(rgb1, rgb2) {
    const l1 = this.getLuminance(rgb1.r || rgb1[0], rgb1.g || rgb1[1], rgb1.b || rgb1[2]);
    const l2 = this.getLuminance(rgb2.r || rgb2[0], rgb2.g || rgb2[1], rgb2.b || rgb2[2]);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  },

  // HEX 유효성 검사
  isValidHex(hex) {
    return /^#[0-9A-F]{6}$/i.test(hex);
  }
};

// 2. 중복된 색상 입력 로직 통합
class ColorInputManager {
  constructor(colorPickerId, hexInputId, onChangeCallback) {
    this.colorPicker = document.getElementById(colorPickerId);
    this.hexInput = document.getElementById(hexInputId);
    this.onChange = onChangeCallback;
    this.setupListeners();
  }

  setupListeners() {
    this.colorPicker.addEventListener('input', () => this.updateFromPicker());
    this.hexInput.addEventListener('blur', () => this.updateFromHex());
    this.hexInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.updateFromHex();
    });
  }

  updateFromPicker() {
    const hex = this.colorPicker.value;
    this.hexInput.value = hex.toUpperCase();
    this.onChange(hex);
  }

  updateFromHex() {
    let hex = this.hexInput.value.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    
    if (ColorUtils.isValidHex(hex)) {
      this.colorPicker.value = hex;
      this.hexInput.value = hex.toUpperCase();
      this.onChange(hex);
    } else {
      // 잘못된 입력 시 이전 값으로 복원
      this.hexInput.value = this.colorPicker.value.toUpperCase();
    }
  }

  setValue(hex) {
    if (ColorUtils.isValidHex(hex)) {
      this.colorPicker.value = hex;
      this.hexInput.value = hex.toUpperCase();
    }
  }

  getValue() {
    return this.colorPicker.value;
  }
}

// 3. 컬러 생성 로직 개선 (중복 제거)
class ColorGenerator {
  constructor() {
    this.steps = [50, 75, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    this.lightModeGrayTones = [
      '#FFFFFF', '#F7F7F7', '#F0F0F0', '#E8E8E8', '#DDDDDD', 
      '#CCCCCC', '#B4B4B4', '#9E9E9E', '#8A8A8A', '#6A6A6A', 
      '#464646', '#1F1F1F', '#000000'
    ];
    this.darkModeGrayTones = [
      '#0C0C0C', '#141414', '#1C1C1C', '#242424', '#313131',
      '#414141', '#525252', '#626262', '#808080', '#ADADAD',
      '#E3E3E3', '#F4F4F4', '#FCFCFC'
    ];
    this.DARK_BG = { r: 12, g: 12, b: 12 };
    this.LIGHT_BG = { r: 255, g: 255, b: 255 };
  }

  generateColors(inputHex, mode, autoTuningValue = 0) {
    const [inputH, inputS, inputL] = ColorUtils.hexToHsl(inputHex);
    const colors = [];
    const grayTones = mode === 'dark' ? this.darkModeGrayTones : this.lightModeGrayTones;
    const backgroundRgb = mode === 'dark' ? this.DARK_BG : this.LIGHT_BG;
    
    const inputRgb = ColorUtils.hexToRgb(inputHex);
    const inputContrast = ColorUtils.getContrast(inputRgb, backgroundRgb);
    
    this.steps.forEach((step, index) => {
      const grayTone = grayTones[index];
      const grayLightness = ColorUtils.hexToHsl(grayTone)[2];
      
      let finalHex;
      
      if (inputS < 5) {
        // 무채색인 경우 그레이스케일 사용
        finalHex = grayTone;
      } else {
        // 유채색인 경우 톤 매칭
        finalHex = this.generateTonedColor(inputH, inputS, grayLightness, autoTuningValue, index);
      }
      
      const finalRgb = ColorUtils.hexToRgb(finalHex);
      const actualContrast = ColorUtils.getContrast(finalRgb, backgroundRgb);
      const contrastDiff = Math.abs(actualContrast - inputContrast);
      
      colors.push({
        step,
        hex: finalHex,
        lightness: grayLightness,
        contrast: actualContrast,
        contrastDiff,
        isClosest: false,
        grayReference: grayTone
      });
    });
    
    // 가장 유사한 컬러 찾기
    const closestColor = colors.reduce((prev, current) => 
      prev.contrastDiff < current.contrastDiff ? prev : current
    );
    closestColor.isClosest = true;
    
    return colors;
  }

  generateTonedColor(h, s, targetLightness, autoTuningValue, stepIndex) {
    let adjustedLightness = targetLightness + autoTuningValue;
    
    // 색상별 자동 조정
    if (autoTuningValue !== 0) {
      adjustedLightness += this.getColorAdjustment(h);
    }
    
    // 채도 조정
    let adjustedSaturation = this.getSaturationForStep(s, stepIndex);
    
    // 범위 제한
    adjustedLightness = Math.max(0, Math.min(100, adjustedLightness));
    adjustedSaturation = Math.max(0, Math.min(100, adjustedSaturation));
    
    const [r, g, b] = ColorUtils.hslToRgb(h, adjustedSaturation, adjustedLightness);
    return ColorUtils.rgbToHex(r, g, b);
  }

  getColorAdjustment(hue) {
    if (hue >= 45 && hue <= 75) return -6; // 노랑
    if (hue >= 15 && hue <= 45) return -4; // 오렌지
    if (hue >= 345 || hue <= 15) return -2; // 빨강
    if (hue >= 270 && hue <= 300) return 3; // 보라
    if (hue >= 210 && hue <= 270) return 4; // 파랑
    if (hue >= 180 && hue <= 210) return 2; // 청록
    if (hue >= 150 && hue <= 180) return 2; // 민트
    if (hue >= 75 && hue <= 90) return -2; // 연두
    return 0;
  }

  getSaturationForStep(baseSaturation, stepIndex) {
    if (stepIndex < 3) return baseSaturation * 0.3; // 50, 75, 100
    if (stepIndex < 6) return baseSaturation * 0.6; // 150, 200, 300
    if (stepIndex > 9) return Math.min(100, baseSaturation * 1.2); // 800, 900, 950
    return baseSaturation;
  }

  calculateAutoTuning(hex) {
    const [h, s, l] = ColorUtils.hexToHsl(hex);
    let autoValue = this.getColorAdjustment(h);
    
    // 채도/명도에 따른 추가 조정
    if (s > 80) autoValue -= 1;
    else if (s < 40) autoValue += 1;
    if (l > 70) autoValue -= 1;
    else if (l < 40) autoValue += 1;
    
    return Math.max(-10, Math.min(10, autoValue));
  }
}

// 4. 메시지 핸들링 통합
class MessageHandler {
  constructor() {
    this.successElement = document.getElementById('successMessage');
  }

  showSuccess(message, duration = 3000) {
    this.successElement.textContent = message;
    this.successElement.className = 'success-message show';
    setTimeout(() => {
      this.successElement.className = 'success-message';
    }, duration);
  }

  sendToFigma(type, data) {
    parent.postMessage({ 
      pluginMessage: { 
        type,
        ...data
      }
    }, '*');
  }

  handlePluginMessage(message) {
    switch (message.type) {
      case 'plugin-ready':
        console.log('플러그인 준비 완료:', message.message);
        break;
      case 'variable-created':
        this.showSuccess('Variable이 성공적으로 생성되었습니다! 🎉');
        break;
      case 'style-created':
        this.showSuccess('Style이 성공적으로 생성되었습니다! 🎉');
        break;
      default:
        console.log('알 수 없는 메시지:', message.type);
    }
  }
}

// 5. 메인 앱 클래스로 통합
class ColorGeneratorApp {
  constructor() {
    this.colorGenerator = new ColorGenerator();
    this.messageHandler = new MessageHandler();
    this.currentMode = 'light';
    this.generatedColors = [];
    this.referenceColor = null;
    
    this.init();
  }

  init() {
    this.setupColorInputs();
    this.setupEventListeners();
    this.updateDisplay();
  }

  setupColorInputs() {
    // 기본 컬러 입력
    this.baseColorInput = new ColorInputManager(
      'baseColor', 
      'hexInput', 
      (hex) => this.updateDisplay()
    );

    // 레퍼런스 컬러 입력
    this.referenceColorInput = new ColorInputManager(
      'referenceColorPicker',
      'referenceColorHex',
      (hex) => this.updateReferenceDisplay()
    );

    // 새 컬러 입력
    this.newColorInput = new ColorInputManager(
      'newColorPicker',
      'newColorHex',
      () => {}
    );
  }

  setupEventListeners() {
    // Auto Tuning 토글
    document.getElementById('autoTuning').addEventListener('change', (e) => {
      if (!e.target.checked) {
        document.getElementById('tuningSlider').value = 0;
        document.getElementById('tuningValue').textContent = '0';
      }
      this.updateDisplay();
    });

    // 슬라이더 이벤트
    const tuningSlider = document.getElementById('tuningSlider');
    const handleSliderChange = () => {
      if (!document.getElementById('autoTuning').checked) {
        const value = parseInt(tuningSlider.value) || 0;
        document.getElementById('tuningValue').textContent = value;
        this.updateDisplay();
      }
    };
    
    tuningSlider.addEventListener('input', handleSliderChange);
    tuningSlider.addEventListener('change', handleSliderChange);

    // 모드 버튼
    document.getElementById('lightBtn').addEventListener('click', () => this.setMode('light'));
    document.getElementById('darkBtn').addEventListener('click', () => this.setMode('dark'));

    // 탭 전환
    document.getElementById('generatorTab').addEventListener('click', () => this.switchTab('generator'));
    document.getElementById('toneMatchingTab').addEventListener('click', () => this.switchTab('tone-matching'));

    // Variable/Style 생성
    document.getElementById('variableName').addEventListener('input', () => this.updateVariablePreview());
    document.getElementById('basicScaleOnly').addEventListener('change', () => this.updateVariablePreview());

    // 레퍼런스 관련
    document.getElementById('setRefBtn').addEventListener('click', () => this.setReferenceColor());
    document.getElementById('clearRefBtn').addEventListener('click', () => this.clearReference());
    document.getElementById('getSuggestionsBtn').addEventListener('click', () => this.generateToneMatching());

    // 플러그인 메시지 수신
    window.addEventListener('message', (event) => {
      const message = event.data.pluginMessage;
      if (message) this.messageHandler.handlePluginMessage(message);
    });
  }

  updateDisplay() {
    const inputHex = this.baseColorInput.getValue();
    const isAutoMode = document.getElementById('autoTuning').checked;
    
    let autoTuningValue = 0;
    if (isAutoMode) {
      autoTuningValue = this.colorGenerator.calculateAutoTuning(inputHex);
      document.getElementById('tuningSlider').value = autoTuningValue;
      document.getElementById('tuningSlider').disabled = true;
    } else {
      autoTuningValue = parseInt(document.getElementById('tuningSlider').value) || 0;
      document.getElementById('tuningSlider').disabled = false;
    }
    
    document.getElementById('tuningValue').textContent = autoTuningValue;
    
    // 상태 업데이트
    this.updateStatusBadge(isAutoMode, autoTuningValue);
    
    // 색상 생성 및 표시
    this.generatedColors = this.colorGenerator.generateColors(inputHex, this.currentMode, autoTuningValue);
    this.displayColors();
  }

  updateStatusBadge(isAutoMode, value) {
    const statusBadge = document.getElementById('statusBadge');
    if (isAutoMode) {
      statusBadge.textContent = `Auto: ${value > 0 ? '+' : ''}${value}`;
      statusBadge.className = 'status-badge auto-status';
    } else {
      statusBadge.textContent = 'Manual Mode';
      statusBadge.className = 'status-badge';
    }
  }

  displayColors() {
    const container = document.getElementById('colorResults');
    container.innerHTML = '';
    
    this.generatedColors.forEach(color => {
      const row = this.createColorRow(color);
      container.appendChild(row);
    });
  }

  createColorRow(color) {
    let badge = '';
    if (color.contrast >= 7) badge = '<span class="accessibility-badge badge-aaa">AAA</span>';
    else if (color.contrast >= 4.5) badge = '<span class="accessibility-badge badge-aa">AA</span>';
    else if (color.contrast >= 3) badge = '<span class="accessibility-badge badge-a">A</span>';
    
    const row = document.createElement('div');
    row.className = color.isClosest ? 'color-row closest' : 'color-row';
    
    const textColor = ColorUtils.getLuminance(...Object.values(ColorUtils.hexToRgb(color.hex))) > 0.5 ? '#000' : '#fff';
    
    row.innerHTML = `
      <div class="color-swatch" style="background: ${color.hex}; color: ${textColor}">
        ${color.step}${color.isClosest ? ' ★' : ''}
      </div>
      <div class="color-info">
        <span class="color-hex" onclick="app.copyColor('${color.hex}')" title="클릭하여 복사">
          ${color.hex.toUpperCase()}
        </span>
        <div class="contrast-info">
          <span>${color.contrast.toFixed(2)}:1</span>
          ${badge}
          ${color.isClosest ? '<span class="input-label">INPUT</span>' : ''}
        </div>
      </div>
    `;
    
    return row;
  }

  copyColor(hex) {
    // 기존 copyColor 로직 그대로 유지
    const clickedElement = event.target;
    clickedElement.classList.add('copied');
    setTimeout(() => clickedElement.classList.remove('copied'), 500);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(hex).then(() => {
          this.messageHandler.showSuccess(`📋 ${hex} 복사됨!`);
        }).catch(() => this.fallbackCopyMethod(hex));
      } else {
        this.fallbackCopyMethod(hex);
      }
    } catch (error) {
      this.fallbackCopyMethod(hex);
    }
  }

  fallbackCopyMethod(hex) {
    // 기존 fallback 로직 유지
    try {
      const tempInput = document.createElement('input');
      tempInput.value = hex;
      tempInput.style.cssText = 'position: absolute; left: -9999px; opacity: 0;';
      document.body.appendChild(tempInput);
      
      tempInput.select();
      tempInput.setSelectionRange(0, 99999);
      
      const success = document.execCommand('copy');
      document.body.removeChild(tempInput);
      
      if (success) {
        this.messageHandler.showSuccess(`📋 ${hex} 복사됨!`);
      } else {
        this.showHexModal(hex);
      }
    } catch (error) {
      this.showHexModal(hex);
    }
  }

  setMode(mode) {
    this.currentMode = mode;
    document.getElementById('darkBtn').className = mode === 'dark' ? 'mode-btn active' : 'mode-btn';
    document.getElementById('lightBtn').className = mode === 'light' ? 'mode-btn active' : 'mode-btn';
    this.updateDisplay();
  }

  // ... 기타 메서드들 (switchTab, setReferenceColor, etc.)는 기존 로직 유지하되 this.messageHandler 사용
}

// 6. 앱 초기화
let app;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new ColorGeneratorApp();
  });
} else {
  app = new ColorGeneratorApp();
}