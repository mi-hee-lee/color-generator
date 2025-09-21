// Figma Plugin Backend Code - Version 14 (Improved)

// UI 표시
figma.showUI(__html__, { 
  width: 360, 
  height: 700,
  themeColors: true 
});

// =====================================
// 색상 안전 레일 함수들 (네온/고채도 처리)
// =====================================

// HSL 채도 조정
function setSaturation(hex, targetSaturation, hue) {
  var hsl = hexToHsl(hex);
  
  // 색상별 채도 부스트
  var boostFactor = 1.0;
  
  if (hue >= 0 && hue <= 30) {         // 빨강
    boostFactor = 1.3;
  } else if (hue >= 30 && hue <= 60) { // 주황
    boostFactor = 1.2;
  } else if (hue >= 60 && hue <= 120) { // 초록
    boostFactor = 1.4;
  } else if (hue >= 180 && hue <= 240) { // 파랑
    boostFactor = 1.4;
  } else if (hue >= 240 && hue <= 300) { // 보라
    boostFactor = 1.35;
  }
  
  var adjustedSaturation = Math.min(targetSaturation * boostFactor, 100);
  hsl[1] = Math.min(hsl[1], adjustedSaturation);
  
  return hslToHex(hsl[0], hsl[1], hsl[2]);
}

// 네온 색상 감지
function isNeon(hex) {
  var hsl = hexToHsl(hex);
  var L = hsl[2];
  var S = hsl[1];
  
  // 매우 밝고(L≥85) 채도가 높은(S≥60) 경우 네온으로 간주
  if (L >= 85 && S >= 60) {
    return true;
  }
  
  // 추가 조건: 매우 밝은 노랑/녹색 계열
  var H = hsl[0];
  if (L >= 80 && S >= 40 && (H >= 50 && H <= 150)) {
    return true;
  }
  
  return false;
}

// Y값 계산 (sRGB relative luminance, 0~1)
function getYValue(hex) {
  var rgb = hexToRgb(hex);
  return relativeLuminance(rgb);
}

// =====================================
// WCAG 대비비율 계산 함수들
// =====================================

// sRGB를 선형 RGB로 변환
function srgbToLinear(n) {
  // n은 0-1 범위
  if (n <= 0.03928) {
    return n / 12.92;
  } else {
    return Math.pow((n + 0.055) / 1.055, 2.4);
  }
}

// 상대 휘도 계산
function relativeLuminance(rgb) {
  // rgb는 0-255 범위
  var r = srgbToLinear(rgb.r / 255);
  var g = srgbToLinear(rgb.g / 255);
  var b = srgbToLinear(rgb.b / 255);
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// 대비비율 계산
function contrastRatio(hex1, hex2) {
  var rgb1 = hexToRgb(hex1);
  var rgb2 = hexToRgb(hex2);
  
  var l1 = relativeLuminance(rgb1);
  var l2 = relativeLuminance(rgb2);
  
  var lighter = Math.max(l1, l2);
  var darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// =====================================
// 유틸리티 함수들
// =====================================

// HEX를 RGB로 변환
function hexToRgb(hex) {
  var cleanHex = hex.replace('#', '');
  
  // 3자리 HEX 처리
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(function(char) { 
      return char + char; 
    }).join('');
  }
  
  // 8자리 HEX인 경우 앞 6자리만 사용
  if (cleanHex.length === 8) {
    cleanHex = cleanHex.substring(0, 6);
  }
  
  var result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

// Figma RGB 변환
function hexToFigmaRGB(hex) {
  var cleanHex = hex.replace('#', '');
  
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(function(char) { 
      return char + char; 
    }).join('');
  }
  
  var result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  };
}

function figmaRGBComponentTo255(value) {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  if (value > 1) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}

function figmaRGBToHex(color) {
  if (!color) return '#000000';
  var r = figmaRGBComponentTo255(color.r);
  var g = figmaRGBComponentTo255(color.g);
  var b = figmaRGBComponentTo255(color.b);
  return '#' + [r, g, b].map(function(component) {
    var hex = component.toString(16).toUpperCase();
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// HSL 변환 함수들
function hexToHsl(hex) {
  var r = parseInt(hex.slice(1, 3), 16) / 255;
  var g = parseInt(hex.slice(3, 5), 16) / 255;
  var b = parseInt(hex.slice(5, 7), 16) / 255;

  var max = Math.max(r, g, b);
  var min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h = h % 360;
  if (h < 0) h += 360;
  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));
  
  h /= 360;
  s /= 100;
  l /= 100;
  
  var a = s * Math.min(l, 1 - l);
  var f = function(n) {
    var k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  
  var r = Math.round(f(0) * 255);
  var g = Math.round(f(8) * 255);
  var b = Math.round(f(4) * 255);
  
  return "#" + [r, g, b].map(function(x) {
    var hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

// =====================================
// Figma 변수 관련 함수들
// =====================================

// 변수 찾기/생성
async function findOrCreateVariable(name, collection, type) {
  var existingVars = await figma.variables.getLocalVariablesAsync(type);
  var existing = existingVars.find(function(v) {
    return v.name === name && v.variableCollectionId === collection.id;
  });
  
  if (existing) {
    return existing;
  } else {
    return figma.variables.createVariable(name, collection, type);
  }
}

// 모드 찾기/생성
function findOrCreateMode(collection, modeName) {
  var existingMode = collection.modes.find(function(mode) { 
    return mode.name === modeName; 
  });
  if (existingMode) {
    return existingMode.modeId;
  } else {
    return collection.addMode(modeName);
  }
}

// 가장 가까운 step 찾기 (모드별 독립 계산)
function findClosestStep(scaleColors, inputHex) {
  var inputHsl = hexToHsl(inputHex);
  var inputLightness = inputHsl[2];
  var closestStep = 500;
  var minDifference = Infinity;
  
  // 실제 생성된 색상들의 명도와 비교
  for (var i = 0; i < scaleColors.length; i++) {
    var step = scaleColors[i].step;
    var stepHex = scaleColors[i].hex;  // 실제 생성된 색상
    var stepHsl = hexToHsl(stepHex);
    var stepLightness = stepHsl[2];    // 실제 색상의 명도
    
    // 입력 색상과 실제 스케일 색상의 명도 차이 비교
    var diff = Math.abs(inputLightness - stepLightness);
    
    if (diff < minDifference) {
      minDifference = diff;
      closestStep = step;
    }
  }
  
  return closestStep;
}

// 단계 조정 헬퍼 함수 (±단계 이동 with 클램핑)
function adjustStep(currentStep, adjustment) {
  var steps = [50, 75, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  var currentIndex = steps.indexOf(currentStep);

  if (currentIndex === -1) {
    // 현재 단계를 찾을 수 없으면 가장 가까운 단계 찾기
    var minDiff = Infinity;
    for (var i = 0; i < steps.length; i++) {
      var diff = Math.abs(steps[i] - currentStep);
      if (diff < minDiff) {
        minDiff = diff;
        currentIndex = i;
      }
    }
  }
  
  var newIndex = currentIndex + adjustment;
  
  // 클램핑: 50-950 범위 내로 제한
  if (newIndex < 0) {
    return steps[0]; // 50
  }
  if (newIndex >= steps.length) {
    return steps[steps.length - 1]; // 950
  }

  return steps[newIndex];
}

function getCustomBackgroundScaleInfo(theme) {
  if (!theme) {
    return { scaleColors: [], themeName: '' };
  }

  if (
    theme.backgroundTheme &&
    theme.backgroundTheme.scaleColors &&
    Array.isArray(theme.backgroundTheme.scaleColors.light) &&
    theme.backgroundTheme.scaleColors.light.length > 0
  ) {
    return {
      scaleColors: theme.backgroundTheme.scaleColors.light,
      themeName: theme.backgroundTheme.themeName || theme.themeName
    };
  }

  if (theme.scaleColors && Array.isArray(theme.scaleColors.light)) {
    return {
      scaleColors: theme.scaleColors.light,
      themeName: theme.themeName
    };
  }

  return { scaleColors: [], themeName: theme.themeName };
}

function resolveCustomSilentColor(theme, mappingValue) {
  if (!theme || !theme.customBackgroundColor) return null;

  var scaleInfo = getCustomBackgroundScaleInfo(theme);
  var scale = scaleInfo.scaleColors;
  var baseHex = theme.customBackgroundColor;
  var result = {
    hex: baseHex,
    step: null,
    themeName: scaleInfo.themeName
  };

  if (Array.isArray(scale) && scale.length > 0) {
    var baseStep = findClosestStep(scale, baseHex);
    if (typeof baseStep === 'number' && !isNaN(baseStep)) {
      result.step = baseStep;
    }

    if (mappingValue !== 'CUSTOM_SILENT' && result.step !== null) {
      var luminance = getPerceptualLuminance(baseHex);
      var direction = luminance >= 0.5 ? -1 : 1;
      var magnitude = (mappingValue === 'CUSTOM_SILENT_PRESSED') ? 2 : 1;
      var targetStep = adjustStep(result.step, direction * magnitude);
      var entry = scale.find(function(color) { return color.step === targetStep; });

      if (entry && entry.hex) {
        result.hex = entry.hex;
        result.step = targetStep;
      } else {
        var hsl = hexToHsl(baseHex);
        var adjL = Math.max(0, Math.min(100, hsl[2] + direction * magnitude * 5));
        result.hex = hslToHex(hsl[0], hsl[1], adjL);
        result.step = targetStep;
      }
    }
  } else if (mappingValue !== 'CUSTOM_SILENT') {
    var hslBase = hexToHsl(baseHex);
    var luminanceBase = getPerceptualLuminance(baseHex);
    var dir = luminanceBase >= 0.5 ? -1 : 1;
    var mag = (mappingValue === 'CUSTOM_SILENT_PRESSED') ? 2 : 1;
    var adjustedL = Math.max(0, Math.min(100, hslBase[2] + dir * mag * 5));
    result.hex = hslToHex(hslBase[0], hslBase[1], adjustedL);
  }

  return result;
}

function resolveCustomBackgroundLowColor(theme, mappingValue) {
  if (!theme || !theme.customBackgroundColor) return null;

  var scaleInfo = getCustomBackgroundScaleInfo(theme);
  var scale = scaleInfo.scaleColors;
  var result = {
    hex: theme.customBackgroundColor,
    step: null,
    themeName: scaleInfo.themeName
  };

  if (!mappingValue) {
    return result;
  }

  var parts = mappingValue.split(':');
  var targetStep = null;
  if (parts.length > 1) {
    var parsed = parseInt(parts[1], 10);
    if (!isNaN(parsed)) {
      targetStep = parsed;
    }
  }

  if (Array.isArray(scale) && scale.length > 0 && targetStep) {
    var entry = scale.find(function(color) { return color.step === targetStep; });
    if (!entry) {
      entry = scale.reduce(function(prev, curr) {
        if (!prev) return curr;
        return Math.abs(curr.step - targetStep) < Math.abs(prev.step - targetStep) ? curr : prev;
      }, null);
    }
    if (entry && entry.hex) {
      result.hex = entry.hex;
      result.step = entry.step;
    }
  }

  return result;
}

function resolveCustomBackgroundAlpha(theme, mappingValue) {
  if (!theme || !theme.customBackgroundColor) return null;

  var parts = mappingValue.split(':');
  var target = parts.length > 1 ? parseInt(parts[1], 10) : 100;
  if (isNaN(target)) target = 100;

  // 기본 알파 스케일(0~1000)을 0~1 범위로 변환
  var opacity = Math.max(0, Math.min(1, target / 1000));
  var rgb = hexToFigmaRGB(theme.customBackgroundColor);

  return {
    color: rgb,
    opacity: opacity
  };
}

function getPerceptualLuminance(hex) {
  var rgb = hexToRgb(hex);
  if (!rgb) return 0;

  function toLinear(value) {
    var normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  }

  var r = toLinear(rgb.r);
  var g = toLinear(rgb.g);
  var b = toLinear(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getHueBrightness(hue, saturation, lightness) {
  if (saturation < 20) {
    if (lightness >= 70) return 'very-bright';
    if (lightness >= 50) return 'bright';
    if (lightness >= 30) return 'medium';
    return 'dark';
  }

  if (lightness >= 80) return 'very-bright';
  if (lightness <= 20) return 'dark';

  var base;

  if ((hue >= 50 && hue <= 70) || (hue >= 170 && hue <= 190)) {
    base = 'very-bright';
  } else if ((hue >= 30 && hue <= 50) || (hue >= 70 && hue <= 170)) {
    base = 'bright';
  } else if ((hue >= 210 && hue <= 270) || (hue >= 0 && hue <= 20) || hue >= 300) {
    base = 'dark';
  } else {
    base = 'medium';
  }

  if (saturation > 80) {
    if (base === 'dark') base = 'medium';
    else if (base === 'medium') base = 'bright';
  } else if (saturation < 40) {
    if (base === 'very-bright') base = 'bright';
    else if (base === 'bright') base = 'medium';
  }

  if (lightness > 65 && base === 'medium') return 'bright';
  if (lightness < 35 && base === 'medium') return 'dark';

  return base;
}

function assessColorRange(closestStep, baseColor) {
  var info = {
    isInherentlyBright: false,
    colorRange: 'medium',
    luminance: 0,
    hueBrightness: 'medium'
  };

  if (!baseColor) {
    return info;
  }

  var hsl = hexToHsl(baseColor);
  var hue = hsl[0];
  var saturation = hsl[1];
  var lightness = hsl[2];
  var luminance = getPerceptualLuminance(baseColor);
  var hueBrightness = getHueBrightness(hue, saturation, lightness);

  info.luminance = luminance;
  info.hueBrightness = hueBrightness;

  var isInherentlyBright = false;

  if (luminance > 0.5) {
    isInherentlyBright = true;
  } else if (luminance > 0.3) {
    isInherentlyBright = (hueBrightness === 'very-bright' || hueBrightness === 'bright');
  } else {
    isInherentlyBright = false;
  }

  info.isInherentlyBright = isInherentlyBright;

  if (isInherentlyBright) {
    if (closestStep <= 300) {
      info.colorRange = 'light';
    } else if (closestStep >= 400 && closestStep <= 700) {
      info.colorRange = 'medium';
    } else if (closestStep > 700) {
      info.colorRange = 'dark';
    } else {
      info.colorRange = 'light';
    }
  } else {
    if (closestStep < 200) {
      info.colorRange = 'light';
    } else if (closestStep >= 300 && closestStep <= 700) {
      info.colorRange = 'medium';
    } else {
      info.colorRange = 'dark';
    }
  }

  return info;
}

// =====================================
// 동적 매핑 함수들
// =====================================

// 통합 동적 매핑 함수
function getDynamicMappings(closestStep, themeName, applicationMode, baseColor) {
  var mappings = {};
  
  console.log('[Backend] getDynamicMappings 호출됨 - closestStep:', closestStep, 'applicationMode:', applicationMode, 'baseColor:', baseColor);
  
  var colorInfo = assessColorRange(closestStep, baseColor);
  var isInherentlyBright = colorInfo.isInherentlyBright;
  var colorRange = colorInfo.colorRange;
  
  console.log('[Backend] 본질적 밝기 판단 - isInherentlyBright:', isInherentlyBright);
  console.log('[Backend] 결정된 색상 범위 - colorRange:', colorRange, 'closestStep:', closestStep);
  
  
  // 기존 호환성을 위한 변수
  var isLightRange = colorRange === 'light';
  

  // =====================================
  // Mode: accent-on-bg-off (foreground emphasis)
  // =====================================
  if (applicationMode === 'accent-on-bg-off') {
    console.log('[Backend] accent-on-bg-off 적용 - colorRange:', colorRange);
    if (colorRange === 'light') {
      // 밝은 범위 (Step≤300 OR L≥80% OR BornBright(40°≤H≤190°))
      mappings['semantic/text/primary'] = 'STATIC-WHITE-ALPHA:900';
      mappings['semantic/text/secondary'] = 'STATIC-WHITE-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'STATIC-WHITE-ALPHA:600';
      mappings['semantic/text/disabled'] = 'STATIC-WHITE-ALPHA:500';
      mappings['semantic/text/on-color'] = 'STATIC-WHITE-ALPHA:900';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + '950';
      mappings['semantic/background/gradient-default'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/surface-contents'] = 'STATIC-WHITE-ALPHA:200';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/border/divider-strong'] = 'STATIC-WHITE-ALPHA:900';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'STATIC-WHITE-ALPHA:200';
      mappings['semantic/border/line'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'STATIC-WHITE-ALPHA:200';
      
      mappings['semantic/fill/silent'] =  'REF:' + themeName + '950';
      mappings['semantic/fill/silent-hover'] =  'REF:' + themeName + '900';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '900';
      
      mappings['semantic/common/accent'] = 'ORANGE-RED-300';
      mappings['semantic/common/accent-pressed'] = 'ORANGE-RED-400';
      mappings['semantic/common/accent-hover'] = 'ORANGE-RED-400';
      mappings['semantic/common/muted'] = 'STATIC-WHITE-ALPHA:400';
      
      mappings['semantic/common/custom-accent'] = 'REF:' + themeName + 500;
      mappings['semantic/common/custom-accent-low'] = 'REF:' + themeName + 900;
      
      mappings['semantic/fill/tertiary'] = 'STATIC-WHITE-ALPHA:400';
      mappings['semantic/fill/tertiary-hover'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/tertiary-pressed'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/disabled'] = 'STATIC-WHITE-ALPHA:200';
      
    } else if (colorRange === 'medium') {
      // 중간 범위 (Step 400-600)
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + '100';
      mappings['semantic/background/gradient-default'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:75';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);

      mappings['semantic/border/divider-strong'] = 'GRAY:950';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + '150';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '150';
      
      mappings['semantic/common/accent'] = 'ORANGE-RED-400';
      mappings['semantic/common/accent-pressed'] = 'ORANGE-RED-500';
      mappings['semantic/common/accent-hover'] = 'ORANGE-RED-500';
      mappings['semantic/common/muted'] = 'GRAY-ALPHA:300';
      mappings['semantic/common/custom-accent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/common/custom-accent-low'] = 'REF:' + themeName + 50;

      mappings['semantic/fill/tertiary'] = 'GRAY-ALPHA:300';
      mappings['semantic/fill/tertiary-hover'] = 'GRAY-ALPHA:400';
      mappings['semantic/fill/tertiary-pressed'] = 'GRAY-ALPHA:400';
      mappings['semantic/fill/disabled'] = 'GRAY-ALPHA:200';
      
    } else {
      // 어두운 범위 (Step 700-950)
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + '100';
      mappings['semantic/background/gradient-default'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:75';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);

      mappings['semantic/border/divider-strong'] = 'GRAY:950';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + '150';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '150';
      
      mappings['semantic/common/accent'] = 'ORANGE-RED-400';
      mappings['semantic/common/accent-pressed'] = 'ORANGE-RED-500';
      mappings['semantic/common/accent-hover'] = 'ORANGE-RED-500';
      mappings['semantic/common/muted'] = 'GRAY-ALPHA:300';
      mappings['semantic/common/custom-accent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/common/custom-accent-low'] = 'REF:' + themeName + 50;

      mappings['semantic/fill/tertiary'] = 'GRAY-ALPHA:300';
      mappings['semantic/fill/tertiary-hover'] = 'GRAY-ALPHA:400';
      mappings['semantic/fill/tertiary-pressed'] = 'GRAY-ALPHA:400';
      mappings['semantic/fill/disabled'] = 'GRAY-ALPHA:200';
    }
    
  // =====================================
  // Mode: accent-on-bg-fixed (foreground on white background)
  // =====================================
  } else if (applicationMode === 'accent-on-bg-fixed') {
    console.log('[Backend] accent-on-bg-fixed 적용 - colorRange:', colorRange);
    mappings['semantic/background/default'] = 'GRAY:50';
    
    if (colorRange === 'light') {
      // 밝은 범위 (Step≤300 OR L≥80% OR BornBright(40°≤H≤190°))
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';

      mappings['semantic/background/gradient-default'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:75';
      mappings['semantic/shadow/default'] = 'ALPHA:' + themeName + '100'

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/border/divider-strong'] = 'GRAY:950';
      mappings['semantic/border/line-selected'] = 'GRAY:900';
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:100';
      mappings['semantic/border/line'] = 'GRAY:200';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'GRAY:50';
      mappings['semantic/fill/silent-hover'] = 'GRAY:75';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:75';
      
      mappings['semantic/common/accent'] = 'ORANGE-RED-400';
      mappings['semantic/common/accent-pressed'] = 'ORANGE-RED-500';
      mappings['semantic/common/accent-hover'] = 'ORANGE-RED-500';
      mappings['semantic/common/muted'] = 'GRAY:300';

      mappings['semantic/common/custom-accent'] = 'REF:' + themeName + 500;
      mappings['semantic/common/custom-accent-low'] = 'REF:' + themeName + 50;
      
    } else if (colorRange === 'medium') {
      // 중간 범위 (Step 400-600)
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/gradient-default'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:75';
      mappings['semantic/shadow/default'] = 'ALPHA:' + themeName + '100'

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      
      mappings['semantic/border/divider-strong'] = 'GRAY:950';
      mappings['semantic/border/line-selected'] = 'GRAY:900';
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:100';
      mappings['semantic/border/line'] = 'GRAY:200';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'GRAY:50';
      mappings['semantic/fill/silent-hover'] = 'GRAY:75';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:75';
      
      mappings['semantic/common/accent'] = 'ORANGE-RED-400';
      mappings['semantic/common/accent-pressed'] = 'ORANGE-RED-500';
      mappings['semantic/common/accent-hover'] = 'ORANGE-RED-500';
      mappings['semantic/common/muted'] = 'GRAY:300';

      mappings['semantic/common/custom-accent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/common/custom-accent-low'] = 'REF:' + themeName + 50;
      
    } else {
      // 어두운 범위 (Step 700-950)
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/gradient-default'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:75';
      mappings['semantic/shadow/default'] = 'ALPHA:' + themeName + '100'

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      
      mappings['semantic/border/divider-strong'] = 'GRAY:950';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:100';
      mappings['semantic/border/line'] = 'GRAY:200';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'GRAY:50';
      mappings['semantic/fill/silent-hover'] = 'GRAY:75';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:75';
      
      mappings['semantic/common/accent'] = 'ORANGE-RED-400';
      mappings['semantic/common/accent-pressed'] = 'ORANGE-RED-500';
      mappings['semantic/common/accent-hover'] = 'ORANGE-RED-500';
      mappings['semantic/common/muted'] = 'GRAY:300';
      mappings['semantic/common/custom-accent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/common/custom-accent-low'] = 'REF:' + themeName + 50;
    }
  
  // =====================================
  // Mode: accent-on-bg-black (foreground on black background)
  // =====================================
  } else if (applicationMode === 'accent-on-bg-black') {
    console.log('[Backend] accent-on-bg-black 적용 - colorRange:', colorRange);
    // 배경은 항상 black으로 고정
    mappings['semantic/background/default'] = 'GRAY:950';
    
    if (colorRange === 'light') {
      // 밝은 범위
      mappings['semantic/text/primary'] = 'STATIC-WHITE-ALPHA:900';
      mappings['semantic/text/secondary'] = 'STATIC-WHITE-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'STATIC-WHITE-ALPHA:600';
      mappings['semantic/text/disabled'] = 'STATIC-WHITE-ALPHA:500';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/gradient-default'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/surface-contents'] = 'STATIC-WHITE-ALPHA:200';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/border/divider-strong'] =  'STATIC-WHITE-ALPHA:900';
      mappings['semantic/border/line-selected'] =  'STATIC-WHITE-ALPHA:900';
      mappings['semantic/border/divider'] = 'STATIC-WHITE-ALPHA:200';
      mappings['semantic/border/line'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'STATIC-WHITE-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'GRAY:950';
      mappings['semantic/fill/silent-hover'] = 'GRAY:900';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:900';
      
      mappings['semantic/common/accent'] = 'ORANGE-RED-400';
      mappings['semantic/common/accent-pressed'] = 'ORANGE-RED-300';
      mappings['semantic/common/accent-hover'] = 'ORANGE-RED-300';
      mappings['semantic/common/muted'] = 'STATIC-WHITE-ALPHA:400';

      mappings['semantic/common/custom-accent'] = 'REF:' + themeName + 500;
      mappings['semantic/common/custom-accent-low'] = 'REF:' + themeName + 900;

      mappings['semantic/fill/tertiary'] = 'STATIC-WHITE-ALPHA:400';
      mappings['semantic/fill/tertiary-hover'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/tertiary-pressed'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/disabled'] = 'STATIC-WHITE-ALPHA:200';
      
    } else if (colorRange === 'medium') {
      mappings['semantic/text/primary'] = 'STATIC-WHITE-ALPHA:900';
      mappings['semantic/text/secondary'] = 'STATIC-WHITE-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'STATIC-WHITE-ALPHA:600';
      mappings['semantic/text/disabled'] = 'STATIC-WHITE-ALPHA:500';
      mappings['semantic/text/on-color'] = 'GRAY:900';
       
      mappings['semantic/background/gradient-default'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/surface-contents'] = 'STATIC-WHITE-ALPHA:200';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + closestStep;
      
      mappings['semantic/border/divider-strong'] =  'STATIC-WHITE-ALPHA:900';
      mappings['semantic/border/line-selected'] =  'STATIC-WHITE-ALPHA:900';
      mappings['semantic/border/divider'] = 'STATIC-WHITE-ALPHA:200';
      mappings['semantic/border/line'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'STATIC-WHITE-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'GRAY:950';
      mappings['semantic/fill/silent-hover'] = 'GRAY:900';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:900';
      
      mappings['semantic/common/accent'] = 'ORANGE-RED-400';
      mappings['semantic/common/accent-pressed'] = 'ORANGE-RED-300';
      mappings['semantic/common/accent-hover'] = 'ORANGE-RED-300';
      mappings['semantic/common/muted'] = 'STATIC-WHITE-ALPHA:400';

      mappings['semantic/common/custom-accent'] = 'REF:' + themeName + 500;
      mappings['semantic/common/custom-accent-low'] = 'REF:' + themeName + 900;

      mappings['semantic/fill/tertiary'] = 'STATIC-WHITE-ALPHA:400';
      mappings['semantic/fill/tertiary-hover'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/tertiary-pressed'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/disabled'] = 'STATIC-WHITE-ALPHA:200';
      
    } else {
      // 어두운 범위 (Step 700-950)
      mappings['semantic/text/primary'] = 'STATIC-WHITE-ALPHA:900';
      mappings['semantic/text/secondary'] = 'STATIC-WHITE-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'STATIC-WHITE-ALPHA:600';
      mappings['semantic/text/disabled'] = 'STATIC-WHITE-ALPHA:500';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/background/gradient-default'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/surface-contents'] = 'STATIC-WHITE-ALPHA:200';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + closestStep;
      
      mappings['semantic/border/divider-strong'] =  'STATIC-WHITE-ALPHA:900';
      mappings['semantic/border/line-selected'] =  'STATIC-WHITE-ALPHA:900';
      mappings['semantic/border/divider'] = 'STATIC-WHITE-ALPHA:200';
      mappings['semantic/border/line'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'STATIC-WHITE-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'GRAY:950';
      mappings['semantic/fill/silent-hover'] = 'GRAY:900';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:900';
      
      mappings['semantic/common/accent'] = 'ORANGE-RED-400';
      mappings['semantic/common/accent-pressed'] = 'ORANGE-RED-300';
      mappings['semantic/common/accent-hover'] = 'ORANGE-RED-300';
      mappings['semantic/common/muted'] = 'STATIC-WHITE-ALPHA:400';
      
      mappings['semantic/common/custom-accent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/common/custom-accent-low'] = 'REF:' + themeName + 900;

      mappings['semantic/fill/tertiary'] = 'STATIC-WHITE-ALPHA:400';
      mappings['semantic/fill/tertiary-hover'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/tertiary-pressed'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/disabled'] = 'STATIC-WHITE-ALPHA:200';
    }
  
  // =====================================
  // Custom Background: 배경만 사용자 지정, 나머지는 기본 매핑 사용
  // =====================================
  } else if (applicationMode === 'custom-background') {
    console.log('[Backend] Custom Background 모드 실행');

    // 기본적으로 accent-on-bg-off 매핑을 사용하되, 배경만 사용자 지정
    if (colorRange === 'light') {
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/secondary'] = 'GRAY:300';
      mappings['semantic/text/tertiary'] = 'GRAY:400';
      mappings['semantic/text/disabled'] = 'GRAY:600';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      // 배경은 CUSTOM으로 표시 (나중에 handleApplyThemeColorsToFrame에서 처리)
      mappings['semantic/background/default'] = 'CUSTOM_BACKGROUND';
      mappings['semantic/fill/surface-contents'] = 'STATIC-WHITE-ALPHA:200';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/border/divider-strong'] = 'GRAY:50';
      mappings['semantic/border/line-selected'] = 'GRAY:50';
      mappings['semantic/border/divider'] = 'STATIC-WHITE-ALPHA:200';
      mappings['semantic/border/line'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'STATIC-WHITE-ALPHA:200';
      
      // silent는 커스텀 배경 기반으로 UI에서 직접 계산하도록 특수 토큰 사용
      mappings['semantic/fill/silent'] = 'CUSTOM_SILENT';
      mappings['semantic/fill/silent-hover'] = 'CUSTOM_SILENT_HOVER';
      mappings['semantic/fill/silent-pressed'] = 'CUSTOM_SILENT_PRESSED';
      
      mappings['semantic/common/accent'] = 'ORANGE-RED-400';
      mappings['semantic/common/accent-pressed'] = 'ORANGE-RED-300';
      mappings['semantic/common/accent-hover'] = 'ORANGE-RED-300';
      mappings['semantic/common/muted'] = 'GRAY:700';
      
      mappings['semantic/common/custom-accent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/common/custom-accent-low'] = 'CUSTOM_BACKGROUND_LOW:900';
      
      mappings['semantic/fill/tertiary'] = 'STATIC-WHITE-ALPHA:200';
      mappings['semantic/fill/tertiary-hover'] = 'STATIC-WHITE-ALPHA:100';
      mappings['semantic/fill/tertiary-pressed'] = 'STATIC-WHITE-ALPHA:100'
      mappings['semantic/fill/disabled'] = 'STATIC-WHITE-ALPHA:100';
      
    } else {
      // 어두운 범위도 accent-on-bg-off 로직을 재사용
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/default'] = 'CUSTOM_BACKGROUND';
      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:100';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);

      mappings['semantic/border/divider-strong'] = 'GRAY:900';
      mappings['semantic/border/line-selected'] = 'GRAY:900';
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'CUSTOM_SILENT';
      mappings['semantic/fill/silent-hover'] = 'CUSTOM_SILENT_HOVER';
      mappings['semantic/fill/silent-pressed'] = 'CUSTOM_SILENT_PRESSED';
      
      mappings['semantic/common/accent'] = 'ORANGE-RED-400';
      mappings['semantic/common/accent-pressed'] = 'ORANGE-RED-500';
      mappings['semantic/common/accent-hover'] = 'ORANGE-RED-500';
      mappings['semantic/common/muted'] = 'GRAY:300';
      mappings['semantic/common/custom-accent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/common/custom-accent-low'] = 'CUSTOM_BACKGROUND_LOW:50';
      
      mappings['semantic/fill/tertiary'] = 'GRAY-ALPHA:100';
      mappings['semantic/fill/tertiary-hover'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/tertiary-pressed'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/disabled'] = 'GRAY:150';
    }
  }
  
  return mappings;
}

function getBackgroundStageOverrides(theme) {
  if (!theme || !theme.scaleColors || !Array.isArray(theme.scaleColors.light) || theme.scaleColors.light.length === 0) return null;

  var baseColor = theme.baseColor;
  var themeName = theme.themeName;
  if (!themeName) return null;

  var baseHex = baseColor;
  if (!baseHex && theme.scaleColors.light.length > 0) {
    baseHex = theme.scaleColors.light[0].hex;
  }

  var closestStep = findClosestStep(theme.scaleColors.light, baseHex || '#FFFFFF');
  var colorInfo = assessColorRange(closestStep, baseColor);
  var colorRange = colorInfo.colorRange;
  var overrides = {};

  if (colorRange === 'light') {
    // 배경 관련
    overrides['semantic/background/default'] = 'REF:' + themeName + closestStep;
    overrides['semantic/fill/surface-contents'] = 'GRAY-ALPHA:100';
    overrides['semantic/background/gradient-default'] = 'REF:' + themeName + closestStep;
    overrides['semantic/common/custom-accent-low'] = 'ALPHA:' + themeName + '50';
    
    // 텍스트 관련
    overrides['semantic/text/primary'] = 'GRAY:900';
    overrides['semantic//common/custom-accent'] = 'REF:' + themeName + adjustStep(closestStep, 1);
    overrides['semantic/text/secondary'] = 'GRAY:700';
    overrides['semantic/text/tertiary'] = 'GRAY:600';
    overrides['semantic/text/disabled'] = 'GRAY:400';
    overrides['semantic/text/disabled'] = 'GRAY:50';
    
    // Silent 버튼 관련
    overrides['semantic/fill/silent'] = 'REF:' + themeName + closestStep;
    overrides['semantic/fill/silent-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
    overrides['semantic/fill/silent-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
    
    // 보더 관련
    overrides['semantic/border/divider-strong'] = 'GRAY:950';
    overrides['semantic/border/line-selected'] = 'REF:' + themeName + adjustStep(closestStep, 2);
    overrides['semantic/border/divider'] = 'GRAY-ALPHA:100';
    overrides['semantic/border/line'] = 'GRAY:200';
    overrides['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';

    // Accent 관련
    overrides['semantic/common/accent'] = 'ORANGE-RED-400';
    overrides['semantic/common/accent-pressed'] = 'ORANGE-RED-500';
    overrides['semantic/common/accent-hover'] = 'ORANGE-RED-500';
    overrides['semantic/common/muted'] = 'GRAY-ALPHA:300';
    
    // Tertiary 버튼 관련
    overrides['semantic/fill/tertiary'] = 'GRAY-ALPHA:200';
    overrides['semantic/fill/tertiary-hover'] = 'GRAY-ALPHA:300';
    overrides['semantic/fill/tertiary-pressed'] = 'GRAY-ALPHA:300';
    overrides['semantic/fill/disabled'] = 'GRAY-ALPHA:100';

  } else if (colorRange === 'medium') {
    // 배경 관련
    overrides['semantic/background/default'] = 'REF:' + themeName + closestStep;
    overrides['semantic/common/custom-accent-low'] = 'ALPHA:' + themeName + '50';
    overrides['semantic/fill/surface-contents'] = 'STATIC-WHITE-ALPHA:200';
    overrides['semantic/background/gradient-default'] = 'REF:' + themeName + closestStep;
    
    // 텍스트 관련
    overrides['semantic/text/primary'] = 'STATIC-WHITE-ALPHA:900';
    overrides['semantic/common/custom-accent'] = 'REF:' + themeName + adjustStep(closestStep, -2);
    overrides['semantic/text/secondary'] = 'STATIC-WHITE-ALPHA:800';
    overrides['semantic/text/tertiary'] = 'STATIC-WHITE-ALPHA:700';
    overrides['semantic/text/disabled'] = 'STATIC-WHITE-ALPHA:500';
    
    // Silent 버튼 관련
    overrides['semantic/fill/silent'] = 'REF:' + themeName + closestStep;
    overrides['semantic/fill/silent-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
    overrides['semantic/fill/silent-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
    
    // 보더 관련
    overrides['semantic/border/divider-strong'] = 'STATIC-WHITE-ALPHA:900';
    overrides['semantic/border/line-selected'] = 'REF:' + themeName + adjustStep(closestStep, -1);
    overrides['semantic/border/divider'] = 'STATIC-WHITE-ALPHA:200';
    overrides['semantic/border/line'] = 'STATIC-WHITE-ALPHA:300';
    overrides['semantic/border/line-disabled'] = 'STATIC-WHITE-ALPHA:200';
     
    // Accent 관련
    overrides['semantic/common/accent'] = 'ORANGE-RED-300';
    overrides['semantic/common/accent-pressed'] = 'ORANGE-RED-400';
    overrides['semantic/common/accent-hover'] = 'ORANGE-RED-400';
    overrides['semantic/common/muted'] = 'GRAY-ALPHA:400';
    
    // Tertiary 버튼 관련
    overrides['semantic/fill/tertiary'] = 'STATIC-WHITE-ALPHA:400';
    overrides['semantic/fill/tertiary-hover'] = 'STATIC-WHITE-ALPHA:300';
    overrides['semantic/fill/tertiary-pressed'] = 'STATIC-WHITE-ALPHA:300';
    overrides['semantic/fill/disabled'] = 'STATIC-WHITE-ALPHA:200';
    
  } else {
    // 배경 관련 (어두운 범위)
    overrides['semantic/background/default'] = 'REF:' + themeName + closestStep;
    overrides['semantic/common/custom-accent-low'] = 'ALPHA:' + themeName + '900';
    overrides['semantic/fill/surface-contents'] = 'STATIC-WHITE-ALPHA:200';
    overrides['semantic/background/gradient-default'] = 'REF:' + themeName + closestStep;
    
    // 텍스트 관련
    overrides['semantic/text/primary'] = 'STATIC-WHITE-ALPHA:900';
    overrides['semantic/common/custom-accent-low'] = 'REF:' + themeName + adjustStep(closestStep, -2);
    overrides['semantic/text/secondary'] = 'STATIC-WHITE-ALPHA:700';
    overrides['semantic/text/tertiary'] = 'STATIC-WHITE-ALPHA:600';
    overrides['semantic/text/disabled'] = 'STATIC-WHITE-ALPHA:500';
    
    // Silent 버튼 관련
    overrides['semantic/fill/silent'] = 'REF:' + themeName + closestStep;
    overrides['semantic/fill/silent-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
    overrides['semantic/fill/silent-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
    
    // 보더 관련
    overrides['semantic/border/divider-strong'] = 'STATIC-WHITE-ALPHA:900';
    overrides['semantic/border/line-selected'] = 'STATIC-WHITE-ALPHA:900';
    overrides['semantic/border/divider'] = 'STATIC-WHITE-ALPHA:200';
    overrides['semantic/border/line'] = 'STATIC-WHITE-ALPHA:300';
    overrides['semantic/border/line-disabled'] = 'STATIC-WHITE-ALPHA:200';
    
    // Accent 관련
    overrides['semantic/common/accent'] = 'ORANGE-RED-300';
    overrides['semantic/common/accent-pressed'] = 'ORANGE-RED-400';
    overrides['semantic/common/accent-hover'] = 'ORANGE-RED-400';
    overrides['semantic/common/muted'] = 'STATIC-WHITE-ALPHA:400';
    
    // Tertiary 버튼 관련
    overrides['semantic/fill/tertiary'] = 'STATIC-WHITE-ALPHA:400';
    overrides['semantic/fill/tertiary-hover'] = 'STATIC-WHITE-ALPHA:300';
    overrides['semantic/fill/tertiary-pressed'] = 'STATIC-WHITE-ALPHA:300';
    overrides['semantic/fill/disabled'] = 'STATIC-WHITE-ALPHA:200';
  }

  return overrides;
}


// =====================================
// 톤 매칭 함수
// =====================================

function generateToneMatchingSuggestions(referenceHex, inputHex) {
  var refHsl = hexToHsl(referenceHex);
  var inputHsl = hexToHsl(inputHex);
  var suggestions = [];
  
  suggestions.push({
    type: 'Saturation Match',
    hex: hslToHex(inputHsl[0], refHsl[1], inputHsl[2]),
    explanation: '채도를 ' + Math.round(refHsl[1]) + '%로 조정'
  });
  
  suggestions.push({
    type: 'Lightness Match', 
    hex: hslToHex(inputHsl[0], inputHsl[1], refHsl[2]),
    explanation: '명도를 ' + Math.round(refHsl[2]) + '%로 조정'
  });
  
  return suggestions;
}

// =====================================
// 상수 정의
// =====================================

// 기존 값 유지해야 할 토큰 목록
var preserveTokens = [
  'semantic/fill/surface-floating',
  'semantic/fill/surface-dialog', 
  'semantic/fill/surface-sheet',
  'semantic/fill/surface-black',
  'semantic/background/black',
  'semantic/common/on-white',
  'semantic/common/on-white-hover',
  'semantic/common/on-white-pressed',
  'semantic/common/on-black',
  'semantic/common/on-black-hover',
  'semantic/common/on-black-pressed',
  'semantic/overlay/dimmed'
];

// =====================================
// 메시지 핸들러들
// =====================================

// 기본 변수 생성 핸들러
async function handleCreateVariables(msg) {
  var collections = await figma.variables.getLocalVariableCollectionsAsync();
  var collection = collections.find(function(c) { 
    return c.name === 'ruler_v2'; 
  });
  
  if (!collection) {
    collection = figma.variables.createVariableCollection('ruler_v2');
  }
  
  var createdCount = 0;
  
  // Fine Tuning 값 확인
  var tuningValue = msg.tuningValue || 0;
  
  // 듀얼 모드 처리
  if (msg.dualMode) {
    // Light/Dark 모드 확인 및 생성
    var lightMode = collection.modes.find(function(m) { return m.name === 'Light'; });
    var darkMode = collection.modes.find(function(m) { return m.name === 'Dark'; });
    
    if (!lightMode) {
      if (collection.modes.length === 1 && collection.modes[0].name === 'Mode 1') {
        // 기본 모드 이름 변경
        collection.renameMode(collection.modes[0].modeId, 'Light');
        lightMode = collection.modes[0];
      } else {
        lightMode = collection.addMode('Light');
      }
    }
    
    if (!darkMode) {
      darkMode = collection.addMode('Dark');
    }
    
    // Light/Dark 색상 모두 생성
    for (var i = 0; i < msg.lightColors.length; i++) {
      var lightColor = msg.lightColors[i];
      var darkColor = msg.darkColors[i];
      
      if (!lightColor || !lightColor.hex || !darkColor || !darkColor.hex) continue;
      
      var variableName = 'scale/' + msg.variableName + '-' + lightColor.step;
      var variable = await findOrCreateVariable(variableName, collection, 'COLOR');
      
      // Light 모드 값 설정
      variable.setValueForMode(lightMode.modeId, hexToFigmaRGB(lightColor.hex));
      // Dark 모드 값 설정  
      variable.setValueForMode(darkMode.modeId, hexToFigmaRGB(darkColor.hex));
      
      createdCount++;
    }
    
    figma.notify('Created ' + createdCount + ' dual-mode variables');
  } else {
    // 단일 모드 처리
    var modeId = collection.modes[0].modeId;
    
    for (var i = 0; i < msg.colors.length; i++) {
      var color = msg.colors[i];
      if (!color || !color.hex) continue;
      
      var variableName = 'scale/' + msg.variableName + '-' + color.step;
      var variable = await findOrCreateVariable(variableName, collection, 'COLOR');
      variable.setValueForMode(modeId, hexToFigmaRGB(color.hex));
      createdCount++;
    }
    
    figma.notify('Created ' + createdCount + ' variables');
  }
  
  figma.ui.postMessage({ 
    type: 'variable-created',
    success: true,
    count: createdCount,
    dualMode: msg.dualMode,
    tuningValue: tuningValue
  });
}

// 스타일 생성 핸들러
async function handleCreateStyles(msg) {
  var createdCount = 0;
  var paintStyles = [];
  
  for (var i = 0; i < msg.colors.length; i++) {
    var color = msg.colors[i];
    if (!color || !color.hex) continue;
    
    var styleName = msg.styleName + '/' + color.step;
    
    // 기존 스타일 찾기
    var existingStyle = figma.getLocalPaintStyles().find(function(style) {
      return style.name === styleName;
    });
    
    var style;
    if (existingStyle) {
      style = existingStyle;
    } else {
      style = figma.createPaintStyle();
      style.name = styleName;
    }
    
    // 색상 설정
    var rgb = hexToFigmaRGB(color.hex);
    style.paints = [{
      type: 'SOLID',
      color: rgb
    }];
    
    paintStyles.push(style);
    createdCount++;
  }
  
  figma.ui.postMessage({
    type: 'style-created',
    success: true,
    count: createdCount
  });
  
  figma.notify('Created ' + createdCount + ' color styles');
}

// Custom Theme 생성 핸들러
async function handleCreateCustomTheme(msg) {
  var theme = msg.theme;
  var applicationMode = theme.applicationMode || 'accent-on-bg-off';
  
  var collections = await figma.variables.getLocalVariableCollectionsAsync();
  var collection = collections.find(function(c) { 
    return c.name === 'ruler_v2'; 
  });
  
  if (!collection) {
    collection = figma.variables.createVariableCollection('ruler_v2');
  }
  
  // Light/Dark 모드 확인 및 생성 (Scale Generator와 동일한 방식)
  var lightMode = collection.modes.find(function(m) { return m.name === 'Light'; });
  var darkMode = collection.modes.find(function(m) { return m.name === 'Dark'; });
  
  if (!lightMode) {
    if (collection.modes.length === 1 && collection.modes[0].name === 'Mode 1') {
      // 기본 모드 이름 변경
      collection.renameMode(collection.modes[0].modeId, 'Light');
      lightMode = collection.modes[0];
    } else {
      lightMode = { modeId: collection.addMode('Light') };
    }
  }
  
  if (!darkMode) {
    darkMode = { modeId: collection.addMode('Dark') };
  }
  
  var createdCount = 0;
  
  // Scale 색상 생성 (Light/Dark 모드 모두)
  for (var i = 0; i < theme.scaleColors.light.length; i++) {
    var lightColor = theme.scaleColors.light[i];
    var darkColor = theme.scaleColors.dark[i];
    var variableName = 'scale/' + theme.themeName + '-' + lightColor.step;
    
    var variable = await findOrCreateVariable(variableName, collection, 'COLOR');
    
    // Light 모드 값 설정
    variable.setValueForMode(lightMode.modeId, hexToFigmaRGB(lightColor.hex));
    // Dark 모드 값 설정
    variable.setValueForMode(darkMode.modeId, hexToFigmaRGB(darkColor.hex));
    
    createdCount++;
  }
  
  // Alpha 토큰 생성 (Light/Dark 모드 모두)
  var closestStepForAlphaLight = findClosestStep(theme.scaleColors.light, theme.baseColor);
  var closestStepForAlphaDark = findClosestStep(theme.scaleColors.dark, theme.baseColor);
  
  var baseColorLight = theme.scaleColors.light.find(function(c) { 
    return c.step === closestStepForAlphaLight; 
  });
  var baseColorDark = theme.scaleColors.dark.find(function(c) { 
    return c.step === closestStepForAlphaDark; 
  });
  
  if (!baseColorLight) {
    baseColorLight = { hex: theme.baseColor };
  }
  if (!baseColorDark) {
    baseColorDark = { hex: theme.baseColor };
  }
  
  var baseRgbLight = hexToFigmaRGB(baseColorLight.hex);
  var baseRgbDark = hexToFigmaRGB(baseColorDark.hex);
  
  // 고정된 알파 매핑 테이블
  var alphaMapping = {
    0: 0.00, 50: 0.05, 75: 0.08, 100: 0.10, 150: 0.15,
    200: 0.20, 300: 0.30, 400: 0.40, 500: 0.50,
    600: 0.60, 700: 0.70, 800: 0.80, 900: 0.90, 950: 0.95
  };
  
  // alpha-00 먼저 생성
  var transparentVariableName = 'scale/' + theme.themeName + '-alpha-00';
  var transparentVariable = await findOrCreateVariable(transparentVariableName, collection, 'COLOR');
  transparentVariable.setValueForMode(lightMode.modeId, { 
    r: baseRgbLight.r, g: baseRgbLight.g, b: baseRgbLight.b, a: 0 
  });
  transparentVariable.setValueForMode(darkMode.modeId, { 
    r: baseRgbDark.r, g: baseRgbDark.g, b: baseRgbDark.b, a: 0 
  });
  createdCount++;
  
  // 각 단계별 alpha 토큰 생성 (50 제외, 75는 surface-contents에서 사용하므로 생성)
  for (var i = 0; i < theme.scaleColors.light.length; i++) {
    var step = theme.scaleColors.light[i].step;
    
    // 50만 건너뛰기 (75는 surface-contents에서 사용하므로 생성)
    if (step === 50) continue;
    
    var alphaValue = alphaMapping[step];
    if (alphaValue === undefined) continue;
    
    var alphaVariableName = 'scale/' + theme.themeName + '-alpha-' + step;
    var alphaVariable = await findOrCreateVariable(alphaVariableName, collection, 'COLOR');
    
    // Light/Dark 모드 모두에 alpha 값 설정
    alphaVariable.setValueForMode(lightMode.modeId, { 
      r: baseRgbLight.r, g: baseRgbLight.g, b: baseRgbLight.b, a: alphaValue 
    });
    alphaVariable.setValueForMode(darkMode.modeId, { 
      r: baseRgbDark.r, g: baseRgbDark.g, b: baseRgbDark.b, a: alphaValue 
    });
    createdCount++;
  }
  
  // Semantic 토큰은 건드리지 않음 - scale 토큰만 생성
  
  figma.notify('Created ' + createdCount + ' variables for ' + theme.themeName);
}

// 매핑 값을 실제 색상으로 변환하는 함수
function calculateTokenColor(mappingValue, theme, mode) {
  if (!mappingValue) return null;
  
  var scaleColors = mode === 'light' ? theme.scaleColors.light : theme.scaleColors.dark;
  
  if (mappingValue.startsWith('REF:')) {
    var refString = mappingValue.replace('REF:', '');
    var refThemeName = theme.themeName;
    var step = NaN;

    if (/^\d+$/.test(refString)) {
      step = parseInt(refString, 10);
    } else {
      var matchDigits = refString.match(/(\d{1,3})$/);
      if (matchDigits) {
        step = parseInt(matchDigits[1], 10);
        var namePart = refString.slice(0, refString.length - matchDigits[1].length);
        if (namePart) {
          refThemeName = namePart.endsWith('-') ? namePart.slice(0, -1) : namePart;
        }
      }
    }

    if (isNaN(step)) return null;

    var targetScale = scaleColors;
    if (refThemeName !== theme.themeName && theme.backgroundTheme && theme.backgroundTheme.themeName === refThemeName) {
      targetScale = (mode === 'light') ? theme.backgroundTheme.scaleColors.light : theme.backgroundTheme.scaleColors.dark;
    }

    if (!targetScale) return null;

    var colorObj = targetScale.find(function(c) { return c.step == step; });
    return colorObj ? colorObj.hex : null;
  } 
  else if (mappingValue.startsWith('GRAY:')) {
    var grayStep = parseInt(mappingValue.replace('GRAY:', ''));
    // 간단한 그레이 계산 (실제로는 gray scale에서 가져와야 함)
    var grayValue = Math.round(255 - (grayStep / 1000) * 255);
    return '#' + grayValue.toString(16).padStart(2, '0').repeat(3);
  }
  else if (mappingValue.startsWith('ALPHA:')) {
    var alphaString = mappingValue.replace('ALPHA:', '').replace(theme.themeName, '');
    var alphaValue = parseInt(alphaString) / 1000;
    var baseColor = scaleColors.find(function(c) { return c.step == 500; }) || scaleColors[Math.floor(scaleColors.length/2)];
    // 알파값 적용은 Figma에서 별도 처리 - 일단 베이스 색상 반환
    return baseColor ? baseColor.hex : theme.baseColor;
  }
  
  return null;
}

// Frame 선택 상태 확인 핸들러
async function handleCheckFrameSelection(msg) {
  console.log('[Backend] Frame 선택 상태 확인 중...');
  
  var selection = figma.currentPage.selection;
  var frameNodes = selection.filter(function(node) {
    return node.type === 'FRAME';
  });
  
  var frameInfo = {
    hasFrames: frameNodes.length > 0,
    frameCount: frameNodes.length,
    frameNames: frameNodes.map(function(frame) {
      return frame.name;
    })
  };
  
  console.log('[Backend] Frame 선택 정보:', frameInfo);
  
  // UI에 결과 전송
  figma.ui.postMessage({
    type: 'frame-selection-result',
    frameInfo: frameInfo
  });
}

// 테마 토큰을 Layer에 직접 적용하는 핸들러 (semantic 토큰 변경 없이)
async function handleApplyThemeColorsToFrame(msg) {
  var theme = msg.theme;
  var applicationMode = theme.applicationMode || 'accent-on-bg-off';
  var selection = figma.currentPage.selection;
  
  console.log('[Backend] 테마 적용 시작 - applicationMode:', applicationMode);
  console.log('[Backend] 받은 테마 데이터:', theme);
  
  if (selection.length === 0) {
    figma.notify('Frame을 선택해주세요');
    try {
      figma.ui.postMessage({ type: 'error', message: 'Frame을 선택해주세요' });
    } catch (e) {}
    return;
  }
  
  var collections = await figma.variables.getLocalVariableCollectionsAsync();
  var collection = collections.find(function(c) { return c.name === 'ruler_v2'; });
  
  if (!collection) {
    figma.notify('ruler_v2 컬렉션을 찾을 수 없습니다');
    return;
  }
  
  // 동적 매핑 계산 (기존 로직과 동일)
  var closestStep = findClosestStep(theme.scaleColors.light, theme.baseColor);
  console.log('[Backend] Closest step:', closestStep);
  
  // custom-background 선택 시, 매핑은 foreground 중심 로직을 사용하고 배경만 사용자 정의로 대체
  var effectiveMode = (applicationMode === 'custom-background') ? 'accent-on-bg-off' : applicationMode;
  var mappings = getDynamicMappings(closestStep, theme.themeName, effectiveMode, theme.baseColor);
  // 추천 패널에서 인접 스텝을 선택한 경우 배경을 해당 스텝으로 강제 매핑
  if (applicationMode !== 'custom-background' && theme.overrideRecommendedStep) {
    mappings['semantic/background/default'] = 'REF:' + theme.themeName + theme.overrideRecommendedStep;
    mappings['semantic/background/gradient-default'] = 'REF:' + theme.themeName + theme.overrideRecommendedStep;
    mappings['semantic/fill/silent'] = 'REF:' + theme.themeName + theme.overrideRecommendedStep;
    mappings['semantic/fill/silent-hover'] = 'REF:' + theme.themeName + adjustStep(theme.overrideRecommendedStep, -1);
    mappings['semantic/fill/silent-pressed'] = 'REF:' + theme.themeName + adjustStep(theme.overrideRecommendedStep, -1);
  }

  if (applicationMode === 'custom-background') {
    if (theme.backgroundTheme) {
      var backgroundOverrides = getBackgroundStageOverrides(theme.backgroundTheme);
      if (backgroundOverrides) {
        Object.keys(backgroundOverrides).forEach(function(key) {
          mappings[key] = backgroundOverrides[key];
        });
      }
    } else if (theme.customBackgroundColor) {
      mappings['semantic/background/default'] = 'CUSTOM_BACKGROUND';
      mappings['semantic/background/gradient-default'] = 'CUSTOM_BACKGROUND';
    }
  }
  console.log('[Backend] 생성된 매핑:', mappings);
  
  // 모든 변수 가져오기
  var allVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  var appliedCount = 0;
  
  
  // 매핑 값에서 실제 토큰을 찾는 함수
  function findTokenFromMapping(mappingValue) {
    if (!mappingValue) return null;
    
    
    if (mappingValue.startsWith('REF:')) {
      var refString = mappingValue.replace('REF:', '');
      var refThemeName = theme.themeName;
      var step = NaN;

      if (/^\d+$/.test(refString)) {
        step = parseInt(refString, 10);
      } else {
        var matchDigits = refString.match(/(\d{1,3})$/);
        if (matchDigits) {
          step = parseInt(matchDigits[1], 10);
          var namePart = refString.slice(0, refString.length - matchDigits[1].length);
          if (namePart && namePart !== '') {
            refThemeName = namePart;
            if (refThemeName.endsWith('-')) {
              refThemeName = refThemeName.slice(0, -1);
            }
          }
        }
      }

      if (!isNaN(step)) {
        var scaleVarName = 'scale/' + refThemeName + '-' + step;
        var foundVar = allVariables.find(function(v) {
          return v.name === scaleVarName && v.variableCollectionId === collection.id;
        });
        if (!foundVar && refThemeName !== theme.themeName) {
          var fallbackVarName = 'scale/' + theme.themeName + '-' + step;
          foundVar = allVariables.find(function(v) {
            return v.name === fallbackVarName && v.variableCollectionId === collection.id;
          });
        }
        return foundVar || null;
      }
    } else if (mappingValue.startsWith('GRAY:')) {
      var grayStep = parseInt(mappingValue.replace('GRAY:', ''));
      var grayVarName = 'scale/gray-' + grayStep;
      return allVariables.find(function(v) {
        return v.name === grayVarName && v.variableCollectionId === collection.id;
      });
    } else if (mappingValue.startsWith('ALPHA:')) {
      var alphaStep = parseInt(mappingValue.replace('ALPHA:', '').replace(theme.themeName, ''));
      
      var alphaVarName = 'scale/' + theme.themeName + '-alpha-' + alphaStep;
      
      return allVariables.find(function(v) {
        return v.name === alphaVarName && v.variableCollectionId === collection.id;
      });
    } else if (mappingValue.startsWith('GRAY-ALPHA:')) {
      var grayAlphaStep = parseInt(mappingValue.replace('GRAY-ALPHA:', ''));
      var grayAlphaVarName = 'scale/gray-alpha-' + grayAlphaStep;
      return allVariables.find(function(v) {
        return v.name === grayAlphaVarName && v.variableCollectionId === collection.id;
      });
    } else if (mappingValue.startsWith('ON-COLOR-ALPHA:')) {
      var onColorStep = parseInt(mappingValue.replace('ON-COLOR-ALPHA:', ''));
      var onColorVarName = 'scale/on-color-alpha-' + onColorStep;
      return allVariables.find(function(v) {
        return v.name === onColorVarName && v.variableCollectionId === collection.id;
      });
    } else if (mappingValue.startsWith('STATIC-WHITE-ALPHA:')) {
      var staticWhiteStep = parseInt(mappingValue.replace('STATIC-WHITE-ALPHA:', ''));
      var staticWhiteVarName = 'static/static-white-alpha-' + staticWhiteStep;
      console.log('🔍 STATIC-WHITE-ALPHA Debug:', mappingValue, '→', staticWhiteVarName);
      var foundVar = allVariables.find(function(v) {
        return v.name === staticWhiteVarName && v.variableCollectionId === collection.id;
      });
      console.log('🔍 Found variable:', foundVar ? foundVar.name : 'NOT FOUND');
      return foundVar;
    } else if (mappingValue.startsWith('STATIC-BLACK-ALPHA:')) {
      var staticBlackStep = parseInt(mappingValue.replace('STATIC-BLACK-ALPHA:', ''));
      var staticBlackVarName = 'static/static-black-alpha-' + staticBlackStep;
      return allVariables.find(function(v) {
        return v.name === staticBlackVarName && v.variableCollectionId === collection.id;
      });
    } else if (mappingValue === 'CUSTOM_BACKGROUND') {
      if (!theme.customBackgroundColor) return null;
      var baseInfo = getCustomBackgroundScaleInfo(theme);
      if (!baseInfo.scaleColors || baseInfo.scaleColors.length === 0) return null;
      var nearest = findClosestStep(baseInfo.scaleColors, theme.customBackgroundColor);
      var varNameBg = 'scale/' + baseInfo.themeName + '-' + nearest;
      var bgVar = allVariables.find(function(v){ return v.name === varNameBg && v.variableCollectionId === collection.id; }) || null;
      if (!bgVar && baseInfo.themeName !== theme.themeName) {
        var fallbackName = 'scale/' + theme.themeName + '-' + nearest;
        bgVar = allVariables.find(function(v){ return v.name === fallbackName && v.variableCollectionId === collection.id; }) || null;
      }
      return bgVar;
    } else if (mappingValue.startsWith('CUSTOM_BACKGROUND_LOW')) {
      var lowInfo = resolveCustomBackgroundLowColor(theme, mappingValue);
      if (!lowInfo || lowInfo.step === null) return null;
      var lowThemeName = lowInfo.themeName || theme.themeName;
      var lowVarName = 'scale/' + lowThemeName + '-' + lowInfo.step;
      var lowVar = allVariables.find(function(v) {
        return v.name === lowVarName && v.variableCollectionId === collection.id;
      });
      if (!lowVar && lowThemeName !== theme.themeName) {
        var fallbackLow = 'scale/' + theme.themeName + '-' + lowInfo.step;
        lowVar = allVariables.find(function(v) {
          return v.name === fallbackLow && v.variableCollectionId === collection.id;
        });
      }
      return lowVar || null;
    } else if (mappingValue.startsWith('CUSTOM_BACKGROUND_ALPHA')) {
      return null;
    } else if (mappingValue === 'CUSTOM_SILENT' || mappingValue === 'CUSTOM_SILENT_HOVER' || mappingValue === 'CUSTOM_SILENT_PRESSED') {
      var silentInfo = resolveCustomSilentColor(theme, mappingValue);
      if (!silentInfo) return null;
      if (mappingValue === 'CUSTOM_SILENT') {
        return null;
      }
      if (silentInfo.step === null) return null;
      var silentThemeName = silentInfo.themeName || theme.themeName;
      var silentVarName = 'scale/' + silentThemeName + '-' + silentInfo.step;
      var silentVar = allVariables.find(function(v) {
        return v.name === silentVarName && v.variableCollectionId === collection.id;
      });
      if (!silentVar && silentThemeName !== theme.themeName) {
        var fallbackSilent = 'scale/' + theme.themeName + '-' + silentInfo.step;
        silentVar = allVariables.find(function(v) {
          return v.name === fallbackSilent && v.variableCollectionId === collection.id;
        });
      }
      return silentVar || null;
    }

    return null;
  }
  
  // fallback 색상 계산 함수
  function getFallbackColor(mappingValue) {
    if (!mappingValue) return { r: 1, g: 1, b: 1 };
    
    if (mappingValue.startsWith('REF:')) {
      var refString = mappingValue.replace('REF:', '');
      var step = parseInt(refString.startsWith(theme.themeName) ? 
                         refString.substring(theme.themeName.length) : refString);
      
      var colorData = theme.scaleColors.light.find(function(c) { 
        return c.step === step; 
      });
      
      if (colorData) {
        return hexToFigmaRGB(colorData.hex);
      }
    } else if (mappingValue.startsWith('GRAY:')) {
      var grayStep = parseInt(mappingValue.replace('GRAY:', ''));
      var grayVar = allVariables.find(function(v) {
        return v.name === 'scale/gray-' + grayStep && v.variableCollectionId === collection.id;
      });
      
      if (grayVar && grayVar.valuesByMode) {
        var lightMode = collection.modes.find(function(m) { return m.name === 'Light'; });
        if (lightMode && grayVar.valuesByMode[lightMode.modeId]) {
          var grayValue = grayVar.valuesByMode[lightMode.modeId];
          if (grayValue && typeof grayValue === 'object' && 'r' in grayValue) {
            // 알파 값 제거하고 RGB만 반환
            return {
              r: grayValue.r,
              g: grayValue.g, 
              b: grayValue.b
            };
          }
        }
      }
    } else if (mappingValue.startsWith('ALPHA:') || mappingValue.startsWith('GRAY-ALPHA:') || mappingValue.startsWith('ON-COLOR-ALPHA:')) {
      // 알파 타입들의 경우 기본 컬러 반환 (실제 알파값은 토큰에서 처리)
      return { r: 0.5, g: 0.5, b: 0.5 };
    } else if (mappingValue.startsWith('STATIC-WHITE-ALPHA:')) {
      // 정적 흰색 알파의 경우 흰색 기본값 반환
      return { r: 1, g: 1, b: 1 };
    } else if (mappingValue.startsWith('STATIC-BLACK-ALPHA:')) {
      // 정적 검은색 알파의 경우 검은색 기본값 반환
      return { r: 0, g: 0, b: 0 };
    } else if (mappingValue === 'CUSTOM_BACKGROUND' && theme.customBackgroundColor) {
      return hexToFigmaRGB(theme.customBackgroundColor);
    } else if (mappingValue.startsWith('CUSTOM_SILENT') && theme.customBackgroundColor) {
      var silentFallback = resolveCustomSilentColor(theme, mappingValue);
      var silentHex = (silentFallback && silentFallback.hex) ? silentFallback.hex : theme.customBackgroundColor;
      return hexToFigmaRGB(silentHex);
    } else if (mappingValue.startsWith('CUSTOM_BACKGROUND_LOW') && theme.customBackgroundColor) {
      var lowFallback = resolveCustomBackgroundLowColor(theme, mappingValue);
      var lowHex = (lowFallback && lowFallback.hex) ? lowFallback.hex : theme.customBackgroundColor;
      return hexToFigmaRGB(lowHex);
    } else if (mappingValue.startsWith('CUSTOM_BACKGROUND_ALPHA') && theme.customBackgroundColor) {
      var alphaFallback = resolveCustomBackgroundAlpha(theme, mappingValue);
      if (alphaFallback) {
        return {
          r: alphaFallback.color.r,
          g: alphaFallback.color.g,
          b: alphaFallback.color.b
        };
      }
      return hexToFigmaRGB(theme.customBackgroundColor);
    }
    
    // 기본 fallback 컬러
    return { r: 1, g: 1, b: 1 };
  }
  
  // 노드의 모든 토큰을 재귀적으로 교체하는 함수
  function replaceTokensInNode(node, depth) {
    var indent = '';
    for (var d = 0; d < depth; d++) indent += '  ';
    
    
    // 현재 노드의 fills 처리
    if ('fills' in node && node.fills && node.fills.length > 0) {
      for (var f = 0; f < node.fills.length; f++) {
        var fill = node.fills[f];
        if (fill.boundVariables && fill.boundVariables.color && fill.boundVariables.color.id) {
          // 기존 바인딩된 변수 찾기
          var currentVar = allVariables.find(function(v) {
            return v.id === fill.boundVariables.color.id;
          });
          
          if (currentVar && currentVar.name.startsWith('semantic/')) {
            
            // 매핑에서 대응하는 토큰 찾기
            var mappedValue = mappings[currentVar.name];
            if (mappedValue) {
              if (mappedValue === 'CUSTOM_BACKGROUND' && theme.customBackgroundColor) {
                var directBgColor = hexToFigmaRGB(theme.customBackgroundColor);
                var updatedFills = node.fills.slice();
                updatedFills[f] = { type: 'SOLID', color: directBgColor };
                node.fills = updatedFills;
                appliedCount++;
                continue;
              }

              if (mappedValue.startsWith('CUSTOM_SILENT') && theme.customBackgroundColor) {
                var silentData = resolveCustomSilentColor(theme, mappedValue);
                var silentHex = (silentData && silentData.hex) ? silentData.hex : theme.customBackgroundColor;
                var silentRgb = hexToFigmaRGB(silentHex);
                var silentFills = node.fills.slice();
                silentFills[f] = { type: 'SOLID', color: silentRgb };
                node.fills = silentFills;
                appliedCount++;
                continue;
              }

              if (mappedValue.startsWith('CUSTOM_BACKGROUND_LOW') && theme.customBackgroundColor) {
                var lowData = resolveCustomBackgroundLowColor(theme, mappedValue);
                var lowHex = (lowData && lowData.hex) ? lowData.hex : theme.customBackgroundColor;
                var lowRgb = hexToFigmaRGB(lowHex);
                var lowFills = node.fills.slice();
                lowFills[f] = { type: 'SOLID', color: lowRgb };
                node.fills = lowFills;
                appliedCount++;
                continue;
              }

              if (mappedValue.startsWith('CUSTOM_BACKGROUND_ALPHA') && theme.customBackgroundColor) {
                var alphaInfo2 = resolveCustomBackgroundAlpha(theme, mappedValue);
                if (alphaInfo2) {
                  var nfAlpha2 = node.fills.slice();
                  nfAlpha2[f] = {
                    type: 'SOLID',
                    color: alphaInfo2.color,
                    opacity: alphaInfo2.opacity
                  };
                  node.fills = nfAlpha2;
                  appliedCount++;
                  continue;
                }
              }

              var newToken = findTokenFromMapping(mappedValue);

              if (newToken) {
                var fallbackColor = getFallbackColor(mappedValue);

                var newFills = node.fills.slice();
                newFills[f] = {
                  type: 'SOLID',
                  color: fallbackColor,
                  boundVariables: {
                    'color': {
                      type: 'VARIABLE_ALIAS',
                      id: newToken.id
                    }
                  }
                };
                node.fills = newFills;

                appliedCount++;
              } else {
              }
            } else {
            }
          }
        }
      }
    }
    
    // 현재 노드의 strokes 처리
    if ('strokes' in node && node.strokes && node.strokes.length > 0) {
      for (var s = 0; s < node.strokes.length; s++) {
        var stroke = node.strokes[s];
        if (stroke.boundVariables && stroke.boundVariables.color && stroke.boundVariables.color.id) {
          // 기존 바인딩된 변수 찾기
          var currentStrokeVar = allVariables.find(function(v) {
            return v.id === stroke.boundVariables.color.id;
          });
          
          if (currentStrokeVar && currentStrokeVar.name.startsWith('semantic/')) {
            
            // 매핑에서 대응하는 토큰 찾기
            var strokeMappedValue = mappings[currentStrokeVar.name];
            if (strokeMappedValue) {
              var newStrokeToken = findTokenFromMapping(strokeMappedValue);
              if (newStrokeToken) {
                var strokeFallbackColor = getFallbackColor(strokeMappedValue);
                var newStrokes = node.strokes.slice();
                newStrokes[s] = {
                  type: 'SOLID',
                  color: strokeFallbackColor,
                  boundVariables: {
                    'color': {
                      type: 'VARIABLE_ALIAS',
                      id: newStrokeToken.id
                    }
                  }
                };
                node.strokes = newStrokes;

                appliedCount++;
              } else {
              }
            } else {
            }
          }
        }
      }
    }
    
    // effects (그림자 등) 처리
    if ('effects' in node && node.effects && node.effects.length > 0) {
      for (var e = 0; e < node.effects.length; e++) {
        var effect = node.effects[e];
        if (effect.boundVariables && effect.boundVariables.color && effect.boundVariables.color.id) {
          var currentEffectVar = allVariables.find(function(v) {
            return v.id === effect.boundVariables.color.id;
          });
          
          if (currentEffectVar && currentEffectVar.name.startsWith('semantic/')) {
            
            var effectMappedValue = mappings[currentEffectVar.name];
            if (effectMappedValue) {
              var newEffectToken = findTokenFromMapping(effectMappedValue);
              if (newEffectToken) {
                // Effect 토큰 교체 - effects 배열 전체 복사 후 수정
                var newEffects = node.effects.slice();
                newEffects[e] = Object.assign({}, effect);
                newEffects[e].boundVariables = {
                  'color': {
                    type: 'VARIABLE_ALIAS',
                    id: newEffectToken.id
                  }
                };
                node.effects = newEffects;
                
                appliedCount++;
              }
            }
          }
        }
      }
    }
    
    // 자식 노드들 재귀 처리
    if ('children' in node && node.children) {
      for (var c = 0; c < node.children.length; c++) {
        replaceTokensInNode(node.children[c], depth + 1);
      }
    }
  }
  
  // 선택된 모든 노드에 토큰 교체 적용
  for (var i = 0; i < selection.length; i++) {
    var node = selection[i];
    replaceTokensInNode(node, 0);
  }
  
  figma.notify('테마 토큰이 ' + appliedCount + '개 요소에 적용되었어요!');
  try {
    figma.ui.postMessage({
      type: 'custom-mode-applied',
      success: true,
      count: appliedCount,
      cleared: 0,
      modeName: applicationMode
    });
  } catch (e) {}
}

// Semantic 토큰을 프레임에 적용하는 핸들러 - handleApplyThemeColorsToFrame과 동일한 방식 사용
async function handleApplySemanticToFrame(msg) {
  var selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.notify('Frame을 선택해주세요');
    return;
  }
  
  var collections = await figma.variables.getLocalVariableCollectionsAsync();
  var collection = collections.find(function(c) { return c.name === 'ruler_v2'; });
  
  if (!collection) {
    throw new Error('ruler_v2 컬렉션을 찾을 수 없습니다');
  }
  
  // 테마 정보가 없으면 기본 semantic 토큰 적용
  if (!msg.theme) {
    var allVariables = await figma.variables.getLocalVariablesAsync('COLOR');
    var semanticVariables = allVariables.filter(function(v) {
      return v.name.startsWith('semantic/') && v.variableCollectionId === collection.id;
    });
    
    var backgroundTokenPriority = [
      'semantic/fill/surface-contents',
      'semantic/background/default',
      'semantic/fill/surface-floating'
    ];
    
    var targetVar = null;
    for (var p = 0; p < backgroundTokenPriority.length; p++) {
      targetVar = semanticVariables.find(function(v) {
        return v.name === backgroundTokenPriority[p];
      });
      if (targetVar) break;
    }
    
    var appliedCount = 0;
    
    for (var i = 0; i < selection.length; i++) {
      var node = selection[i];
      if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        if (targetVar && 'fills' in node) {
          node.fills = [{
            type: 'SOLID',
            boundVariables: {
              'color': { type: 'VARIABLE_ALIAS', id: targetVar.id }
            }
          }];
          appliedCount++;
        }
      }
    }
    
    figma.notify((targetVar ? targetVar.name : 'none') + ' semantic 토큰이 ' + appliedCount + '개 Frame에 적용되었습니다');
    return;
  }
  
  // 테마 정보가 있으면 handleApplyThemeColorsToFrame과 동일한 방식 사용
  var theme = msg.theme;
  var applicationMode = theme.applicationMode || 'accent-on-bg-off';
  
  
  // 동적 매핑 계산
  var closestStep = findClosestStep(theme.scaleColors.light, theme.baseColor);
  var effectiveMode2 = (applicationMode === 'custom-background') ? 'accent-on-bg-off' : applicationMode;
  var mappings = getDynamicMappings(closestStep, theme.themeName, effectiveMode2, theme.baseColor);
  if (applicationMode !== 'custom-background' && theme.overrideRecommendedStep) {
    mappings['semantic/background/default'] = 'REF:' + theme.themeName + theme.overrideRecommendedStep;
    mappings['semantic/fill/silent'] = 'REF:' + theme.themeName + theme.overrideRecommendedStep;
    mappings['semantic/fill/silent-hover'] = 'REF:' + theme.themeName + adjustStep(theme.overrideRecommendedStep, -1);
    mappings['semantic/fill/silent-pressed'] = 'REF:' + theme.themeName + adjustStep(theme.overrideRecommendedStep, -1);
  }
  
  // 커스텀 배경 모드: 변수 생성 없이 배경만 특수 토큰으로 치환 (silent는 스킵)
  if (applicationMode === 'custom-background' && theme.customBackgroundColor) {
    mappings['semantic/background/default'] = 'CUSTOM_BACKGROUND';
    mappings['semantic/background/gradient-default'] = 'CUSTOM_BACKGROUND';
  }
  
  // 모든 변수 가져오기
  var allVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  var appliedCount = 0;
  
  
  // handleApplyThemeColorsToFrame과 동일한 findTokenFromMapping 함수
  function findTokenFromMapping(mappingValue) {
    if (!mappingValue) return null;
    
    if (mappingValue.startsWith('REF:')) {
      var refString = mappingValue.replace('REF:', '');
      var step;
      
      if (refString.startsWith(theme.themeName)) {
        var stepString = refString.substring(theme.themeName.length);
        step = parseInt(stepString);
      } else {
        step = parseInt(refString);
      }
      
      if (step) {
        var scaleVarName = 'scale/' + theme.themeName + '-' + step;
        return allVariables.find(function(v) {
          return v.name === scaleVarName && v.variableCollectionId === collection.id;
        });
      }
    } else if (mappingValue.startsWith('GRAY:')) {
      var grayStep = parseInt(mappingValue.replace('GRAY:', ''));
      var grayVarName = 'scale/gray-' + grayStep;
      return allVariables.find(function(v) {
        return v.name === grayVarName && v.variableCollectionId === collection.id;
      });
    } else if (mappingValue.startsWith('ALPHA:')) {
      var alphaStep = parseInt(mappingValue.replace('ALPHA:', '').replace(theme.themeName, ''));
      
      var alphaVarName = 'scale/' + theme.themeName + '-alpha-' + alphaStep;
      
      return allVariables.find(function(v) {
        return v.name === alphaVarName && v.variableCollectionId === collection.id;
      });
    } else if (mappingValue.startsWith('GRAY-ALPHA:')) {
      var grayAlphaStep = parseInt(mappingValue.replace('GRAY-ALPHA:', ''));
      var grayAlphaVarName = 'scale/gray-alpha-' + grayAlphaStep;
      return allVariables.find(function(v) {
        return v.name === grayAlphaVarName && v.variableCollectionId === collection.id;
      });
    } else if (mappingValue.startsWith('ON-COLOR-ALPHA:')) {
      var onColorStep = parseInt(mappingValue.replace('ON-COLOR-ALPHA:', ''));
      var onColorVarName = 'scale/on-color-alpha-' + onColorStep;
      return allVariables.find(function(v) {
        return v.name === onColorVarName && v.variableCollectionId === collection.id;
      });
    } else if (mappingValue.startsWith('STATIC-WHITE-ALPHA:')) {
      var staticWhiteStep = parseInt(mappingValue.replace('STATIC-WHITE-ALPHA:', ''));
      var staticWhiteVarName = 'static/static-white-alpha-' + staticWhiteStep;
      console.log('🔍 STATIC-WHITE-ALPHA Debug:', mappingValue, '→', staticWhiteVarName);
      var foundVar = allVariables.find(function(v) {
        return v.name === staticWhiteVarName && v.variableCollectionId === collection.id;
      });
      console.log('🔍 Found variable:', foundVar ? foundVar.name : 'NOT FOUND');
      return foundVar;
    } else if (mappingValue.startsWith('STATIC-BLACK-ALPHA:')) {
      var staticBlackStep = parseInt(mappingValue.replace('STATIC-BLACK-ALPHA:', ''));
      var staticBlackVarName = 'static/static-black-alpha-' + staticBlackStep;
      return allVariables.find(function(v) {
        return v.name === staticBlackVarName && v.variableCollectionId === collection.id;
      });
    } else if (mappingValue === 'CUSTOM_BACKGROUND') {
      if (!theme.customBackgroundColor) return null;
      var baseInfo2 = getCustomBackgroundScaleInfo(theme);
      if (!baseInfo2.scaleColors || baseInfo2.scaleColors.length === 0) return null;
      var nearestBg2 = findClosestStep(baseInfo2.scaleColors, theme.customBackgroundColor);
      var varNameBg2 = 'scale/' + baseInfo2.themeName + '-' + nearestBg2;
      var bgVar2 = allVariables.find(function(v){ return v.name === varNameBg2 && v.variableCollectionId === collection.id; }) || null;
      if (!bgVar2 && baseInfo2.themeName !== theme.themeName) {
        var fallbackBg2 = 'scale/' + theme.themeName + '-' + nearestBg2;
        bgVar2 = allVariables.find(function(v){ return v.name === fallbackBg2 && v.variableCollectionId === collection.id; }) || null;
      }
      return bgVar2;
    } else if (mappingValue.startsWith('CUSTOM_BACKGROUND_LOW')) {
      var lowInfo2 = resolveCustomBackgroundLowColor(theme, mappingValue);
      if (!lowInfo2 || lowInfo2.step === null) return null;
      var lowThemeName2 = lowInfo2.themeName || theme.themeName;
      var lowVarName2 = 'scale/' + lowThemeName2 + '-' + lowInfo2.step;
      var lowVar2 = allVariables.find(function(v){ return v.name === lowVarName2 && v.variableCollectionId === collection.id; });
      if (!lowVar2 && lowThemeName2 !== theme.themeName) {
        var fallbackLow2 = 'scale/' + theme.themeName + '-' + lowInfo2.step;
        lowVar2 = allVariables.find(function(v){ return v.name === fallbackLow2 && v.variableCollectionId === collection.id; });
      }
      return lowVar2 || null;
    } else if (mappingValue.startsWith('CUSTOM_BACKGROUND_ALPHA')) {
      return null;
    } else if (mappingValue === 'CUSTOM_SILENT' || mappingValue === 'CUSTOM_SILENT_HOVER' || mappingValue === 'CUSTOM_SILENT_PRESSED') {
      var silentInfo2 = resolveCustomSilentColor(theme, mappingValue);
      if (!silentInfo2) return null;
      if (mappingValue === 'CUSTOM_SILENT') {
        return null;
      }
      if (silentInfo2.step === null) return null;
      var silentThemeName2 = silentInfo2.themeName || theme.themeName;
      var silentVarName2 = 'scale/' + silentThemeName2 + '-' + silentInfo2.step;
      var silentVar2 = allVariables.find(function(v){ return v.name === silentVarName2 && v.variableCollectionId === collection.id; });
      if (!silentVar2 && silentThemeName2 !== theme.themeName) {
        var fallbackSilent2 = 'scale/' + theme.themeName + '-' + silentInfo2.step;
        silentVar2 = allVariables.find(function(v){ return v.name === fallbackSilent2 && v.variableCollectionId === collection.id; });
      }
      return silentVar2 || null;
    }
    
    return null;
  }
  
  // handleApplyThemeColorsToFrame과 동일한 재귀적 토큰 교체 로직
  function replaceTokensInNode(node, depth) {
    var indent = '';
    for (var d = 0; d < depth; d++) indent += '  ';
    
    
    // 현재 노드의 fills 처리
    if ('fills' in node && node.fills && node.fills.length > 0) {
      for (var f = 0; f < node.fills.length; f++) {
        var fill = node.fills[f];
        if (fill.boundVariables && fill.boundVariables.color && fill.boundVariables.color.id) {
          var currentVar = allVariables.find(function(v) {
            return v.id === fill.boundVariables.color.id;
          });
          
          if (currentVar && currentVar.name.startsWith('semantic/')) {
            
            var mappedValue = mappings[currentVar.name];
            if (mappedValue) {
              if (mappedValue === 'CUSTOM_BACKGROUND' && theme.customBackgroundColor) {
                var fillBgColor = hexToFigmaRGB(theme.customBackgroundColor);
                var nf = node.fills.slice();
                nf[f] = { type: 'SOLID', color: fillBgColor };
                node.fills = nf;
                appliedCount++;
                continue;
              }

              if (mappedValue.startsWith('CUSTOM_SILENT') && theme.customBackgroundColor) {
                var fillSilentInfo = resolveCustomSilentColor(theme, mappedValue);
                var fillSilentHex = (fillSilentInfo && fillSilentInfo.hex) ? fillSilentInfo.hex : theme.customBackgroundColor;
                var fillSilentRgb = hexToFigmaRGB(fillSilentHex);
                var nfSilent = node.fills.slice();
                nfSilent[f] = { type: 'SOLID', color: fillSilentRgb };
                node.fills = nfSilent;
                appliedCount++;
                continue;
              }

              if (mappedValue.startsWith('CUSTOM_BACKGROUND_LOW') && theme.customBackgroundColor) {
                var fillLowInfo = resolveCustomBackgroundLowColor(theme, mappedValue);
                var fillLowHex = (fillLowInfo && fillLowInfo.hex) ? fillLowInfo.hex : theme.customBackgroundColor;
                var fillLowRgb = hexToFigmaRGB(fillLowHex);
                var nfLow = node.fills.slice();
                nfLow[f] = { type: 'SOLID', color: fillLowRgb };
                node.fills = nfLow;
                appliedCount++;
                continue;
              }

              if (mappedValue.startsWith('CUSTOM_BACKGROUND_ALPHA') && theme.customBackgroundColor) {
                var alphaInfo = resolveCustomBackgroundAlpha(theme, mappedValue);
                if (alphaInfo) {
                  var nfAlpha = node.fills.slice();
                  nfAlpha[f] = {
                    type: 'SOLID',
                    color: alphaInfo.color,
                    opacity: alphaInfo.opacity
                  };
                  node.fills = nfAlpha;
                  appliedCount++;
                  continue;
                }
              }

              var newToken = findTokenFromMapping(mappedValue);
              if (newToken) {
                var newFills = node.fills.slice();
                newFills[f] = {
                  type: 'SOLID',
                  boundVariables: {
                    'color': {
                      type: 'VARIABLE_ALIAS',
                      id: newToken.id
                    }
                  }
                };
                node.fills = newFills;
                appliedCount++;
              } else {
              }
            } else {
            }
          }
        }
      }
    }
    
    // 자식 노드들도 재귀적으로 처리
    if ('children' in node) {
      for (var c = 0; c < node.children.length; c++) {
        replaceTokensInNode(node.children[c], depth + 1);
      }
    }
  }
  
  // 선택된 노드들을 재귀적으로 처리
  for (var i = 0; i < selection.length; i++) {
    replaceTokensInNode(selection[i], 0);
  }
  
  figma.notify('테마 토큰이 ' + appliedCount + '개 요소에 적용되었습니다');
}

// Custom Mode 적용 핸들러 - 최상위 프레임에만 적용, 자식은 상속
async function handleApplyCustomModeToFrame(msg) {
  var targetModeName = msg.modeName;
  var selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.notify('Frame을 선택해주세요');
    return;
  }
  
  var collections = await figma.variables.getLocalVariableCollectionsAsync();
  var collection = collections.find(function(c) { return c.name === 'ruler_v2'; });
  
  if (!collection) {
    throw new Error('ruler_v2 컬렉션을 찾을 수 없습니다');
  }
  
  var customMode = collection.modes.find(function(m) { return m.name === targetModeName; });
  
  if (!customMode) {
    throw new Error('필요한 모드를 찾을 수 없습니다');
  }
  
  // 최상위 루트 노드만 추출 (다른 선택된 노드에 포함되지 않는 노드들)
  var rootNodes = [];
  for (var i = 0; i < selection.length; i++) {
    var isRoot = true;
    for (var j = 0; j < selection.length; j++) {
      if (i !== j && isAncestor(selection[j], selection[i])) {
        isRoot = false;
        break;
      }
    }
    if (isRoot) {
      rootNodes.push(selection[i]);
    }
  }
  
  var appliedCount = 0;
  var clearedCount = 0;
  
  // 노드가 다른 노드의 조상인지 확인
  function isAncestor(possibleAncestor, node) {
    var parent = node.parent;
    while (parent) {
      if (parent === possibleAncestor) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }
  
  // 자식 노드들의 명시적 모드 설정 제거
  function clearChildrenModes(node) {
    if ('children' in node && node.children) {
      for (var i = 0; i < node.children.length; i++) {
        var child = node.children[i];
        
        // Frame 타입인 경우 명시적 모드 제거 (상속 상태로 변경)
        if (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'INSTANCE') {
          try {
            // 명시적 모드 제거 - null을 설정하면 상속 상태가 됨
            child.setExplicitVariableModeForCollection(collection, null);
            clearedCount++;
          } catch (e) {
            // 이미 상속 상태인 경우 무시
          }
        }
        
        // 재귀적으로 모든 자식 처리
        clearChildrenModes(child);
      }
    }
  }
  
  // 각 루트 노드 처리
  for (var i = 0; i < rootNodes.length; i++) {
    var rootNode = rootNodes[i];
    
    // 루트가 Frame 타입인지 확인
    if (rootNode.type === 'FRAME' || rootNode.type === 'COMPONENT' || rootNode.type === 'INSTANCE') {
      // 최상위 프레임에만 모드 적용
      rootNode.setExplicitVariableModeForCollection(collection, customMode.modeId);
      appliedCount++;
      
      // 모든 자식들의 명시적 모드 설정 제거
      clearChildrenModes(rootNode);
    } else {
      console.warn('선택된 노드가 Frame 타입이 아님:', rootNode.type);
    }
  }
  
  figma.ui.postMessage({
    type: 'custom-mode-applied',
    success: true,
    count: appliedCount,
    cleared: clearedCount,
    modeName: targetModeName
  });
  
  var message = targetModeName + ' 모드가 ' + appliedCount + '개 최상위 Frame에 적용되었습니다';
  if (clearedCount > 0) {
    message += ' (' + clearedCount + '개 자식 Frame 상속 처리)';
  }
  
  figma.notify(message);
}

// 톤 매칭 핸들러
async function handleToneMatching(msg) {
  var suggestions = generateToneMatchingSuggestions(msg.referenceColor, msg.inputColor);
  
  figma.ui.postMessage({
    type: 'tone-matching-complete',
    suggestions: suggestions,
    originalColor: msg.inputColor,
    referenceColor: msg.referenceColor
  });
}

// Mapping 정보 표시 핸들러 - 선택된 Frame 오른쪽에 mapping 정보 표시
async function handleAnnotationControl(msg) {
  
  var selection = figma.currentPage.selection;
  
  if (msg.action === 'show-mapping') {
    if (selection.length === 0) {
      figma.notify('Mapping 정보를 표시할 Frame을 선택해주세요');
      return;
    }
    
    var theme, applicationMode, mappings;
    
    if (!msg.theme) {
      // 테마 정보가 없을 때는 기본값으로 처리
      figma.notify('테마 정보가 없어 기본 매핑을 표시합니다');
      
      // 기본 매핑 생성 (예시)
      mappings = {
        'semantic/background/default': 'GRAY:50',
        'semantic/fill/surface-contents': 'ALPHA:theme150',
        'semantic/fill/primary': 'REF:theme500',
        'semantic/text/primary': 'GRAY:900',
        'semantic/border/divider': 'ON-COLOR-ALPHA:200'
      };
      applicationMode = 'default';
    } else {
      theme = msg.theme;
      applicationMode = theme.applicationMode || 'accent-on-bg-off';
      
      // 동적 매핑 계산
      var closestStep = findClosestStep(theme.scaleColors.light, theme.baseColor);
      mappings = getDynamicMappings(closestStep, theme.themeName, applicationMode, theme.baseColor);
    }
    
    var mappingInfoCount = 0;
    
    try {
      // 폰트 로드
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    } catch (e) {
      await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
    }
    
    for (var i = 0; i < selection.length; i++) {
      var selectedFrame = selection[i];
      
      if (selectedFrame.type === 'FRAME' || selectedFrame.type === 'COMPONENT' || selectedFrame.type === 'INSTANCE') {
        // Frame 오른쪽에 mapping 정보 표시할 위치 계산
        var infoX = selectedFrame.x + selectedFrame.width + 20;
        var infoY = selectedFrame.y;
        
        // 주요 mapping 정보들 수집
        var importantMappings = [
          'semantic/background/default',
          'semantic/fill/surface-contents',
          'semantic/fill/primary',
          'semantic/text/primary',
          'semantic/border/divider'
        ];
        
        var mappingText = 'Mapping Info (' + applicationMode + ')\n';
        if (theme) {
          mappingText += 'Theme: ' + theme.themeName + '\n';
          mappingText += 'Step: ' + closestStep + '\n';
        }
        mappingText += '\n';
        
        // handleApplyThemeColorsToFrame과 동일한 findTokenFromMapping 함수
        function findTokenFromMapping(mappingValue) {
          if (!mappingValue) return null;
          
          if (mappingValue.startsWith('REF:')) {
            var refString = mappingValue.replace('REF:', '');
            var step;
            
            if (theme && refString.startsWith(theme.themeName)) {
              var stepString = refString.substring(theme.themeName.length);
              step = parseInt(stepString);
            } else {
              step = parseInt(refString);
            }
            
            if (step && theme) {
              return 'scale/' + theme.themeName + '-' + step;
            }
            return 'scale/theme-' + step;
          } else if (mappingValue.startsWith('GRAY:')) {
            var grayStep = parseInt(mappingValue.replace('GRAY:', ''));
            return 'scale/gray-' + grayStep;
          } else if (mappingValue.startsWith('ALPHA:')) {
            if (theme) {
              var alphaStep = parseInt(mappingValue.replace('ALPHA:', '').replace(theme.themeName, ''));
              return 'scale/' + theme.themeName + '-alpha-' + alphaStep;
            }
            var alphaStep = parseInt(mappingValue.replace('ALPHA:theme', ''));
            return 'scale/theme-alpha-' + alphaStep;
          } else if (mappingValue.startsWith('GRAY-ALPHA:')) {
            var grayAlphaStep = parseInt(mappingValue.replace('GRAY-ALPHA:', ''));
            return 'scale/gray-alpha-' + grayAlphaStep;
          } else if (mappingValue.startsWith('ON-COLOR-ALPHA:')) {
            var onColorStep = parseInt(mappingValue.replace('ON-COLOR-ALPHA:', ''));
            return 'scale/on-color-alpha-' + onColorStep;
          } else if (mappingValue.startsWith('STATIC-WHITE-ALPHA:')) {
            var staticWhiteStep = parseInt(mappingValue.replace('STATIC-WHITE-ALPHA:', ''));
            return 'static/static-white-alpha-' + staticWhiteStep;
          } else if (mappingValue.startsWith('STATIC-BLACK-ALPHA:')) {
            var staticBlackStep = parseInt(mappingValue.replace('STATIC-BLACK-ALPHA:', ''));
            return 'static/static-black-alpha-' + staticBlackStep;
          }
          
          return mappingValue; // fallback
        }
        
        for (var m = 0; m < importantMappings.length; m++) {
          var tokenName = importantMappings[m];
          var mappingValue = mappings[tokenName];
          if (mappingValue) {
            // CSS 변수 형식으로 표시: --semantic-text/secondary: var(--scale-gray-700);
            var semanticVar = '--' + tokenName;
            var actualTokenName = findTokenFromMapping(mappingValue);
            var scaleVar = '--' + actualTokenName;
            mappingText += semanticVar + ': var(' + scaleVar + ');\n';
          }
        }
        
        // mapping 정보 텍스트 노드 생성
        var mappingInfoNode = figma.createText();
        mappingInfoNode.characters = mappingText;
        mappingInfoNode.fontSize = 10;
        mappingInfoNode.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
        
        // Auto Layout 프레임 생성
        var backgroundFrame = figma.createFrame();
        backgroundFrame.name = 'Mapping Info - ' + selectedFrame.name;
        backgroundFrame.x = infoX;
        backgroundFrame.y = infoY;
        
        // Auto Layout 설정
        backgroundFrame.layoutMode = 'VERTICAL';
        backgroundFrame.paddingTop = 16;
        backgroundFrame.paddingBottom = 16;
        backgroundFrame.paddingLeft = 16;
        backgroundFrame.paddingRight = 16;
        backgroundFrame.itemSpacing = 8;
        backgroundFrame.primaryAxisSizingMode = 'AUTO';
        backgroundFrame.counterAxisSizingMode = 'AUTO';
        
        backgroundFrame.fills = [{ 
          type: 'SOLID', 
          color: { r: 1, g: 1, b: 0.9 }, // 연한 노란색 배경
          opacity: 0.9
        }];
        backgroundFrame.cornerRadius = 8;
        
        // 그림자 효과 추가
        backgroundFrame.effects = [{
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.1 },
          offset: { x: 0, y: 2 },
          radius: 4,
          visible: true,
          blendMode: 'NORMAL'
        }];
        
        // 같은 부모에 추가
        if (selectedFrame.parent && 'appendChild' in selectedFrame.parent) {
          selectedFrame.parent.appendChild(backgroundFrame);
          backgroundFrame.appendChild(mappingInfoNode);
        } else {
          figma.currentPage.appendChild(backgroundFrame);
          backgroundFrame.appendChild(mappingInfoNode);
        }
        
        mappingInfoCount++;
      }
    }
    
    figma.notify(mappingInfoCount + '개 Frame에 Mapping 정보가 표시되었습니다');
    
  }
  
  // UI로 응답 전송
  figma.ui.postMessage({
    type: 'annotation-control-response',
    success: true,
    action: msg.action
  });
}

// =====================================
// 메인 메시지 핸들러
// =====================================

figma.ui.onmessage = async function(msg) {
  
  try {
    if (msg.type === 'create-variables') {
      await handleCreateVariables(msg);
    } else if (msg.type === 'create-styles') {
      await handleCreateStyles(msg);
    } else if (msg.type === 'create-custom-theme') {
      await handleCreateCustomTheme(msg);
    } else if (msg.type === 'apply-custom-mode-to-frame') {
      await handleApplyCustomModeToFrame(msg);
    } else if (msg.type === 'apply-semantic-to-frame') {
      await handleApplySemanticToFrame(msg);
    } else if (msg.type === 'apply-theme-colors-to-frame') {
      await handleApplyThemeColorsToFrame(msg);
    } else if (msg.type === 'generate-tone-matching') {
      await handleToneMatching(msg);
    } else if (msg.type === 'annotation-control') {
      await handleAnnotationControl(msg);
    } else if (msg.type === 'check-frame-selection') {
      await handleCheckFrameSelection(msg);
    } else if (msg.type === 'activate-eyedropper') {
      if (typeof figma.pickColorAsync !== 'function') {
        figma.ui.postMessage({
          type: 'eyedropper-error',
          targetId: msg.targetId,
          message: 'pickColorAsync is not supported in this Figma version.'
        });
        return;
      }

      try {
        var pickedOptions = null;
        if (msg.currentColor && /^#[0-9A-F]{6}$/i.test(msg.currentColor)) {
          pickedOptions = {
            color: hexToFigmaRGB(msg.currentColor),
            mode: 'RGB'
          };
        }

        var pickResult = pickedOptions ? await figma.pickColorAsync(pickedOptions) : await figma.pickColorAsync();
        if (!pickResult) {
          figma.ui.postMessage({
            type: 'eyedropper-cancelled',
            targetId: msg.targetId
          });
          return;
        }

        var pickedColor = pickResult.color || pickResult;
        var opacity = typeof pickResult.opacity === 'number'
          ? pickResult.opacity
          : (typeof pickedColor.a === 'number' ? pickedColor.a : 1);

        figma.ui.postMessage({
          type: 'eyedropper-picked',
          targetId: msg.targetId,
          hex: figmaRGBToHex(pickedColor),
          rgba: {
            r: pickedColor.r,
            g: pickedColor.g,
            b: pickedColor.b,
            a: opacity
          }
        });
      } catch (error) {
        console.error('pickColorAsync error:', error);
        figma.ui.postMessage({
          type: 'eyedropper-error',
          targetId: msg.targetId,
          message: error && error.message ? error.message : String(error)
        });
      }
    }
  } catch (error) {
    console.error('Error handling message:', error);
    figma.notify('Error: ' + error.message, { error: true });
  }
};

// =====================================
// 초기화
// =====================================

// 초기화 메시지
setTimeout(function() {
  figma.ui.postMessage({ 
    type: 'plugin-ready', 
    message: 'Plugin initialized successfully',
    eyedropperSupported: typeof figma.pickColorAsync === 'function'
  });
}, 100);
