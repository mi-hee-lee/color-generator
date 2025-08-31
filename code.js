// Figma Plugin Backend Code - Version 14 (Improved)
console.log('Backend script loading...');

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
  
  console.log('[CLOSEST] Input L:', inputLightness.toFixed(2), '→ Step:', closestStep);
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
    console.log('[STEP ADJUST] Clamped to minimum: 50');
    return steps[0]; // 50
  }
  if (newIndex >= steps.length) {
    console.log('[STEP ADJUST] Clamped to maximum: 950');
    return steps[steps.length - 1]; // 950
  }
  
  console.log('[STEP ADJUST] From', currentStep, 'to', steps[newIndex], '(' + (adjustment > 0 ? '+' : '') + adjustment + ' steps)');
  return steps[newIndex];
}

// =====================================
// 동적 매핑 함수들
// =====================================

// Light 모드 동적 매핑 (300 기준으로 수정)
function getDynamicMappingsLight(closestStepLight, themeName, applicationMode) {
  var mappings = {};
  
  // 200 기준으로 분류
  var isLightRange = closestStepLight < 200;  // 200 미만
  var isMidRange = closestStepLight >= 200;   // 200 이상

  console.log('[LIGHT CLASSIFICATION] closestStep:', closestStepLight);
  console.log('[LIGHT CLASSIFICATION] Range:', isLightRange ? '200 미만' : '200 이상');

  // =====================================
  // 옵션 1: 강조 요소 ON / 배경 요소 OFF
  // =====================================
  if (applicationMode === 'accent-on-bg-off') {
    if (isLightRange) {
      // 300 미만
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/secondary'] = 'GRAY:100';
      mappings['semantic/text/tertiary'] = 'GRAY:200';
      mappings['semantic/text/disabled'] = 'GRAY:600';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + '700';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/border/divider'] = 'ON-COLOR-ALPHA:100';
      mappings['semantic/border/line'] = 'ON-COLOR-ALPHA:200';
      mappings['semantic/border/line-disabled'] = 'ON-COLOR-ALPHA:100';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '300';
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + '200';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '200';
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + '700';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '600';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '600';
      
    } else {
      // 300 이상
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + '50';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/border/divider'] = 'REF:' + themeName + '100';
      mappings['semantic/border/line'] = 'REF:' + themeName + '200';
      mappings['semantic/border/line-disabled'] = 'REF:' + themeName + '100';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '100';
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + adjustStep(closestStepLight, 2);
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
    }
    
  // =====================================
  // 옵션 2: 강조 요소 ON / 배경 고정 (gray50)
  // =====================================
  } else if (applicationMode === 'accent-on-bg-fixed') {
    mappings['semantic/background/default'] = 'GRAY:50';
    
    if (isLightRange) {
      // 300 미만
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/border/divider'] = 'REF:' + themeName + '100';
      mappings['semantic/border/line'] = 'REF:' + themeName + '200';
      mappings['semantic/border/line-disabled'] = 'REF:' + themeName + '100';
      
      mappings['semantic/fill/silent'] = 'GRAY:50';
      mappings['semantic/fill/silent-hover'] = 'GRAY:100';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:100';
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + adjustStep(closestStepLight, 4);
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, 3);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, 3);
      
    } else {
      // 300 이상
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:100';
      mappings['semantic/border/line'] = 'GRAY:200';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'GRAY:50';
      mappings['semantic/fill/silent-hover'] = 'GRAY:100';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:100';
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
    }
    
  // =====================================
  // 옵션 3: 강조 요소 OFF / 배경 요소 ON
  // =====================================
  } else if (applicationMode === 'accent-off-bg-on') {
    if (isLightRange) {
      // 300 미만
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + closestStepLight;
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + '400';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + '500';
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + '500';
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + '400';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + '400';
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + '500';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '600';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '600';
      
    } else {
      // 300 이상
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/secondary'] = 'ON-COLOR-ALPHA:800';
      mappings['semantic/text/tertiary'] = 'ON-COLOR-ALPHA:700';
      mappings['semantic/text/disabled'] ='ON-COLOR-ALPHA:500';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + closestStepLight;
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + '100';
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + '50';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + '50';
      mappings['semantic/border/divider'] = 'ON-COLOR-ALPHA:200';
      mappings['semantic/border/line'] = 'ON-COLOR-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'ON-COLOR-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + '100';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '200';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '200';
    }
  }
  
  // 공통 알파 매핑
  mappings['semantic/fill/tertiary'] = 'ALPHA:' + themeName + '100';
  mappings['semantic/fill/tertiary-hover'] = 'ALPHA:' + themeName + '200';
  mappings['semantic/fill/tertiary-pressed'] = 'ALPHA:' + themeName + '200';
  mappings['semantic/fill/disabled'] = 'ALPHA:' + themeName + '100';
  mappings['semantic/fill/surface-contents'] = 'ALPHA:' + themeName + '100';
  
  return mappings;
}

// Dark 모드 동적 매핑
function getDynamicMappingsDark(closestStepDark, themeName, applicationMode) {
  var mappings = {};
  
  var isLightRange = closestStepDark >= 400;    // 400 이상
  var isMidRange = closestStepDark < 400;   // 400 미만
  
  console.log('[DARK CLASSIFICATION] closestStep:', closestStepDark);
  console.log('[DARK CLASSIFICATION] Range:', isLightRange ? '400 미만' : '400 이상');
  console.log('[DARK CLASSIFICATION] isLightRange:', isLightRange, 'applicationMode:', applicationMode);
  
  // =====================================
  // 옵션 1: 강조 요소 ON / 배경 요소 OFF
  // =====================================
  if (applicationMode === 'accent-on-bg-off') {
    mappings['semantic/background/default'] = 'REF:' + themeName + '50';
    
    if (isLightRange) {
      // 400 미만
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      
      mappings['semantic/fill/tertiary'] = 'GRAY-ALPHA:100';
      mappings['semantic/fill/tertiary-hover'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/fill/tertiary-pressed'] = 'REF:' + themeName + closestStepDark;

      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:100';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:100';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '100';
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + adjustStep(closestStepDark, 3);
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 2);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 2);
      
    } else {
      // 400 이상
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + adjustStep(closestStepDark, 3);
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 2);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 2);
      
      mappings['semantic/fill/tertiary'] = 'GRAY-ALPHA:100';
      mappings['semantic/fill/tertiary-hover'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/tertiary-pressed'] = 'GRAY-ALPHA:200';

      mappings['semantic/border/divider-strong'] ='REF:' + themeName + adjustStep(closestStepDark, 3);
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + adjustStep(closestStepDark, 3);
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:100';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:100';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '100';
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + adjustStep(closestStepDark, 4);
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 3);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 3);
    }
    
  // =====================================
  // 옵션 2: 강조 요소 ON / 배경 고정 (gray50)
  // =====================================
  } else if (applicationMode === 'accent-on-bg-fixed') {
    mappings['semantic/background/default'] = 'GRAY:50';
    mappings['semantic/fill/silent'] = 'GRAY:50';
    mappings['semantic/fill/silent-hover'] = 'GRAY:100';
    mappings['semantic/fill/silent-pressed'] = 'GRAY:100';
    
    if (isLightRange) {
      // 400 미만
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      
      mappings['semantic/fill/tertiary'] = 'ALPHA:' + themeName + '100';
      mappings['semantic/fill/tertiary-hover'] = 'ALPHA:' + themeName + '200';
      mappings['semantic/fill/tertiary-pressed'] = 'ALPHA:' + themeName + '200';

      mappings['semantic/common/attention'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:100';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:100';
      
    } else {
      // 400 이상
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:900';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, -1);
      
      mappings['semantic/fill/tertiary'] = 'ALPHA:' + themeName + '100';
      mappings['semantic/fill/tertiary-hover'] = 'ALPHA:' + themeName + '200';
      mappings['semantic/fill/tertiary-pressed'] = 'ALPHA:' + themeName + '200';

      mappings['semantic/common/attention'] = 'REF:' + themeName + adjustStep(closestStepDark, 4);
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 3);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 3);
      
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:100';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:100';

      mappings['semantic/border/divider-strong'] = 'GRAY-ALPHA:900';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + adjustStep(closestStepDark, 4);
    }
    
  // =====================================
  // 옵션 3: 강조 요소 OFF / 배경 요소 ON
  // =====================================
  } else if (applicationMode === 'accent-off-bg-on') {
    if (isLightRange) {
      // 400 미만
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + adjustStep(closestStepDark, -4);
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 2);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 2);
      
      mappings['semantic/fill/tertiary'] = 'ALPHA:' + themeName + '100';
      mappings['semantic/fill/tertiary-hover'] = 'ALPHA:' + themeName + '200';
      mappings['semantic/fill/tertiary-pressed'] = 'ALPHA:' + themeName + '200';
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + '50';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:100';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:100';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + adjustStep(closestStepDark, 4);
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, -1);
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, -1);
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 2);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 2);
      
    } else {
      // 400 이상
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + adjustStep(closestStepDark, -2);
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + '100';
      
      mappings['semantic/fill/tertiary'] = 'ALPHA:' + themeName + '100';
      mappings['semantic/fill/tertiary-hover'] = 'ALPHA:' + themeName + '200';
      mappings['semantic/fill/tertiary-pressed'] = 'ALPHA:' + themeName + '200';
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + '50';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + '50';
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:100';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:100';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + adjustStep(closestStepDark, 2);
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + '400';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '300';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '300';
    }
  }
  
  // 공통 알파 매핑
  mappings['semantic/fill/disabled'] = 'ALPHA:' + themeName + '100';
  mappings['semantic/fill/surface-contents'] = 'ALPHA:' + themeName + '100';
  
  return mappings;
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
  console.log('Creating variables with tuning value:', tuningValue);
  
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
  
  console.log('Creating theme with application mode:', applicationMode);
  
  var collections = await figma.variables.getLocalVariableCollectionsAsync();
  var collection = collections.find(function(c) { 
    return c.name === 'ruler_v2'; 
  });
  
  if (!collection) {
    collection = figma.variables.createVariableCollection('ruler_v2');
  }
  
  // =====================================
  // STEP 1: 모드 확인 및 생성
  // =====================================
  
  var baseLightMode = collection.modes.find(function(m) { return m.name === 'Light'; });
  var baseDarkMode = collection.modes.find(function(m) { return m.name === 'Dark'; });
  
  if (!baseLightMode) {
    findOrCreateMode(collection, 'Light');
    baseLightMode = collection.modes.find(function(m) { return m.name === 'Light'; });
  }
  if (!baseDarkMode) {
    findOrCreateMode(collection, 'Dark');
    baseDarkMode = collection.modes.find(function(m) { return m.name === 'Dark'; });
  }
  
  var customLightModeId = findOrCreateMode(collection, 'CustomLight');
  var customDarkModeId = findOrCreateMode(collection, 'CustomDark');
  
  var createdCount = 0;
  var skippedCount = 0;
  
  // =====================================
  // STEP 2: Scale 색상 생성
  // =====================================
  
  console.log('=== Creating Scale Variables ===');
  
  for (var i = 0; i < theme.scaleColors.light.length; i++) {
    var lightColor = theme.scaleColors.light[i];
    var darkColor = theme.scaleColors.dark[i];
    var variableName = 'scale/' + theme.themeName + '-' + lightColor.step;
    
    console.log('[SCALE] Creating:', variableName);
    
    var variable = await findOrCreateVariable(variableName, collection, 'COLOR');
    
    // 모든 4개 모드에 값 설정
    variable.setValueForMode(baseLightMode.modeId, hexToFigmaRGB(lightColor.hex));
    variable.setValueForMode(baseDarkMode.modeId, hexToFigmaRGB(darkColor.hex));
    variable.setValueForMode(customLightModeId, hexToFigmaRGB(lightColor.hex));
    variable.setValueForMode(customDarkModeId, hexToFigmaRGB(darkColor.hex));
    
    createdCount++;
  }
  
  // =====================================
  // STEP 3: Alpha 색상 생성
  // =====================================

  console.log('=== Creating Alpha Variables ===');

  // 입력 색상과 가장 가까운 step 찾기
  var closestStepForAlpha = findClosestStep(theme.scaleColors.light, theme.baseColor);
  console.log('[ALPHA BASE] Using closest step for alpha:', closestStepForAlpha);

  // 가장 가까운 step의 색상을 base RGB로 사용
  var baseColorLight = theme.scaleColors.light.find(function(c) { 
    return c.step === closestStepForAlpha; 
  });
  var baseColorDark = theme.scaleColors.dark.find(function(c) { 
    return c.step === closestStepForAlpha; 
  });

  if (!baseColorLight || !baseColorDark) {
    // Fallback: 입력 색상 직접 사용
    console.log('[ALPHA BASE] Using input color as fallback');
    baseColorLight = { hex: theme.baseColor };
    baseColorDark = { hex: theme.baseColor };
  }

  console.log('[ALPHA BASE] Light base:', baseColorLight.hex);
  console.log('[ALPHA BASE] Dark base:', baseColorDark.hex);

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
  console.log('[ALPHA] Creating:', transparentVariableName, 'with base step:', closestStepForAlpha);

  var transparentVariable = await findOrCreateVariable(transparentVariableName, collection, 'COLOR');

  transparentVariable.setValueForMode(baseLightMode.modeId, { 
    r: baseRgbLight.r, g: baseRgbLight.g, b: baseRgbLight.b, a: 0 
  });
  transparentVariable.setValueForMode(baseDarkMode.modeId, { 
    r: baseRgbDark.r, g: baseRgbDark.g, b: baseRgbDark.b, a: 0 
  });
  transparentVariable.setValueForMode(customLightModeId, { 
    r: baseRgbLight.r, g: baseRgbLight.g, b: baseRgbLight.b, a: 0 
  });
  transparentVariable.setValueForMode(customDarkModeId, { 
    r: baseRgbDark.r, g: baseRgbDark.g, b: baseRgbDark.b, a: 0 
  });

  createdCount++;

  // 각 단계별 alpha 토큰 생성 (50, 75, 150 제외)
  for (var i = 0; i < theme.scaleColors.light.length; i++) {
    var step = theme.scaleColors.light[i].step;
    
    // 50, 75, 150은 건너뛰기
    if (step === 50 || step === 75 || step === 150) continue;
    
    var alphaValue = alphaMapping[step];
    
    if (alphaValue === undefined) continue;
    
    var alphaVariableName = 'scale/' + theme.themeName + '-alpha-' + step;
    console.log('[ALPHA] Creating:', alphaVariableName, 'alpha:', alphaValue, 'base from step:', closestStepForAlpha);
    
    var alphaVariable = await findOrCreateVariable(alphaVariableName, collection, 'COLOR');
    
    // 모든 4개 모드에 값 설정 - 가장 가까운 step 색상 기준
    alphaVariable.setValueForMode(baseLightMode.modeId, { 
      r: baseRgbLight.r, g: baseRgbLight.g, b: baseRgbLight.b, a: alphaValue 
    });
    alphaVariable.setValueForMode(baseDarkMode.modeId, { 
      r: baseRgbDark.r, g: baseRgbDark.g, b: baseRgbDark.b, a: alphaValue 
    });
    alphaVariable.setValueForMode(customLightModeId, { 
      r: baseRgbLight.r, g: baseRgbLight.g, b: baseRgbLight.b, a: alphaValue 
    });
    alphaVariable.setValueForMode(customDarkModeId, { 
      r: baseRgbDark.r, g: baseRgbDark.g, b: baseRgbDark.b, a: alphaValue 
    });
    
    createdCount++;
  }

  // on-color-alpha 시리즈 생성
  console.log('=== Creating On-Color Alpha Variables ===');

  // on-color는 일반적으로 대비가 높은 색 (흰색 또는 검은색)
  var onColorLight = { r: 1, g: 1, b: 1 };  // 흰색
  var onColorDark = { r: 0, g: 0, b: 0 };   // 검은색

  // on-color-alpha-00 생성 (완전 투명)
  var onColorAlpha00Name = 'scale/on-color-alpha-00';
  var onColorAlpha00 = await findOrCreateVariable(onColorAlpha00Name, collection, 'COLOR');

  onColorAlpha00.setValueForMode(baseLightMode.modeId, { r: onColorLight.r, g: onColorLight.g, b: onColorLight.b, a: 0 });
  onColorAlpha00.setValueForMode(baseDarkMode.modeId, { r: onColorDark.r, g: onColorDark.g, b: onColorDark.b, a: 0 });
  onColorAlpha00.setValueForMode(customLightModeId, { r: onColorLight.r, g: onColorLight.g, b: onColorLight.b, a: 0 });
  onColorAlpha00.setValueForMode(customDarkModeId, { r: onColorDark.r, g: onColorDark.g, b: onColorDark.b, a: 0 });

  createdCount++;

  // 각 단계별 on-color-alpha 토큰 생성
  for (var i = 0; i < theme.scaleColors.light.length; i++) {
    var step = theme.scaleColors.light[i].step;
    var alphaValue = alphaMapping[step];
    
    if (alphaValue === undefined) continue;
    
    var onColorAlphaName = 'scale/on-color-alpha-' + step;
    console.log('[ON-COLOR-ALPHA] Creating:', onColorAlphaName, 'alpha:', alphaValue);
    
    var onColorAlphaVar = await findOrCreateVariable(onColorAlphaName, collection, 'COLOR');
    
    // 모든 모드에 설정
    onColorAlphaVar.setValueForMode(baseLightMode.modeId, { r: onColorLight.r, g: onColorLight.g, b: onColorLight.b, a: alphaValue });
    onColorAlphaVar.setValueForMode(baseDarkMode.modeId, { r: onColorDark.r, g: onColorDark.g, b: onColorDark.b, a: alphaValue });
    onColorAlphaVar.setValueForMode(customLightModeId, { r: onColorLight.r, g: onColorLight.g, b: onColorLight.b, a: alphaValue });
    onColorAlphaVar.setValueForMode(customDarkModeId, { r: onColorDark.r, g: onColorDark.g, b: onColorDark.b, a: alphaValue });
    
    createdCount++;
  }

  // =====================================
  // STEP 4: 기존 변수 복사 (gray 등 비시맨틱)
  // =====================================

  console.log('=== Copying Non-Semantic Variables ===');

  // 모든 변수 가져오기
  var allVariables = await figma.variables.getLocalVariablesAsync('COLOR');

  // Gray 변수 체크
  console.log('=== Checking Gray Variables ===');
  var grayVariables = allVariables.filter(function(v) {
    return v.name.startsWith('scale/gray-');
  });

  if (grayVariables.length === 0) {
    console.log('[WARNING] No gray variables found!');
  } else {
    console.log('Found', grayVariables.length, 'gray variables');
  }

  // 이제 복사 진행
  for (var i = 0; i < allVariables.length; i++) {
    var v = allVariables[i];
    if (v.variableCollectionId === collection.id && 
        !v.name.startsWith('semantic/') && 
        !v.name.startsWith('scale/' + theme.themeName)) {
      
      if (baseLightMode && v.valuesByMode[baseLightMode.modeId]) {
        v.setValueForMode(customLightModeId, v.valuesByMode[baseLightMode.modeId]);
      }
      if (baseDarkMode && v.valuesByMode[baseDarkMode.modeId]) {
        v.setValueForMode(customDarkModeId, v.valuesByMode[baseDarkMode.modeId]);
      }
      
      console.log('[COPY] Non-semantic variable:', v.name);
    }
  }
  
  // =====================================
  // STEP 5: 동적 매핑 계산 (Light/Dark 모드별 독립 계산)
  // =====================================
  
  console.log('=== Finding closest step for Light mode ===');
  var closestStepLight = findClosestStep(theme.scaleColors.light, theme.baseColor);

  console.log('=== Finding closest step for Dark mode ===');
  var closestStepDark = findClosestStep(theme.scaleColors.dark, theme.baseColor);

  console.log('Closest steps - Light:', closestStepLight, 'Dark:', closestStepDark);

  // Light와 Dark 매핑을 각각 가져오기
  var lightMappings = getDynamicMappingsLight(closestStepLight, theme.themeName, applicationMode);
  var darkMappings = getDynamicMappingsDark(closestStepDark, theme.themeName, applicationMode);

  console.log('[DEBUG] Light mapping for semantic/text/on-color:', lightMappings['semantic/text/on-color']);
  console.log('[DEBUG] Dark mapping for semantic/text/on-color:', darkMappings['semantic/text/on-color']);

  // 두 매핑을 합치기
  var dynamicMappings = {};
  for (var key in lightMappings) {
    dynamicMappings[key] = { 
      light: lightMappings[key], 
      dark: darkMappings[key] 
    };
  }
  
  // Dark 매핑에만 있는 키들도 추가
  for (var key in darkMappings) {
    if (!dynamicMappings[key]) {
      dynamicMappings[key] = { 
        light: lightMappings[key], 
        dark: darkMappings[key] 
      };
    }
  }
  
  console.log('[DEBUG] Total tokens in dynamicMappings:', Object.keys(dynamicMappings).length);
  console.log('[DEBUG] semantic/text/on-color in mappings:', dynamicMappings['semantic/text/on-color']);
  
  // =====================================
  // STEP 6: Semantic 토큰 생성 및 매핑
  // =====================================

  console.log('=== Applying Semantic Mappings ===');

  // 보존해야 할 토큰 목록
  var preserveTokensList = [
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

  // 모든 변수 다시 로드
  allVariables = await figma.variables.getLocalVariablesAsync('COLOR');

  // preserve 토큰들의 원본 값 저장
  var preserveOriginalValues = {};
  for (var k = 0; k < preserveTokensList.length; k++) {
    var preserveTokenName = preserveTokensList[k];
    var preserveVar = allVariables.find(function(v) {
      return v.name === preserveTokenName && v.variableCollectionId === collection.id;
    });
    
    if (preserveVar && baseLightMode && baseDarkMode) {
      preserveOriginalValues[preserveTokenName] = {
        light: preserveVar.valuesByMode[baseLightMode.modeId],
        dark: preserveVar.valuesByMode[baseDarkMode.modeId]
      };
    }
  }

  // 동적 매핑의 모든 토큰 처리
  for (var tokenName in dynamicMappings) {
    var mappedValue = dynamicMappings[tokenName];
    
    console.log('[PROCESSING TOKEN]', tokenName, '→', mappedValue);
    
    var variable = await findOrCreateVariable(tokenName, collection, 'COLOR');
    
    // Light 모드 처리
    if (mappedValue.light) {
      var lightValue = mappedValue.light;
      console.log('[DEBUG LIGHT]', tokenName, 'mapping:', lightValue);
      
      if (lightValue.startsWith('GRAY:')) {
        var grayStep = parseInt(lightValue.replace('GRAY:', ''));
        var grayVarName = 'scale/gray-' + grayStep;
        var grayVar = allVariables.find(function(v) {
          return v.name === grayVarName && v.variableCollectionId === collection.id;
        });
        if (grayVar) {
          variable.setValueForMode(customLightModeId, {
            type: 'VARIABLE_ALIAS',
            id: grayVar.id
          });
          console.log('[MAPPED LIGHT]', tokenName, '→', grayVarName);
        } else {
          console.log('[WARNING] Gray variable not found for LIGHT:', grayVarName, 'for token:', tokenName);
        }
      } else if (lightValue.startsWith('REF:')) {
        var refString = lightValue.replace('REF:', '');
        var step;
        
        // themeName 길이만큼 잘라내고 남은 숫자 추출
        if (refString.startsWith(theme.themeName)) {
          step = parseInt(refString.substring(theme.themeName.length));
        } else {
          // 숫자만 있는 경우 직접 파싱
          step = parseInt(refString);
        }
        
        if (step) {
          var scaleVarName = 'scale/' + theme.themeName + '-' + step;
          var scaleVar = allVariables.find(function(v) {
            return v.name === scaleVarName && v.variableCollectionId === collection.id;
          });
          
          if (scaleVar) {
            variable.setValueForMode(customLightModeId, {
              type: 'VARIABLE_ALIAS',
              id: scaleVar.id
            });
            console.log('[MAPPED LIGHT]', tokenName, '→', scaleVarName);
          }
        }
      } else if (lightValue.startsWith('ALPHA:')) {
        var alphaStep = parseInt(lightValue.replace('ALPHA:', '').replace(theme.themeName, ''));
        var alphaVarName = 'scale/' + theme.themeName + '-alpha-' + alphaStep;
        var alphaVar = allVariables.find(function(v) {
          return v.name === alphaVarName && v.variableCollectionId === collection.id;
        });
        if (alphaVar) {
          variable.setValueForMode(customLightModeId, {
            type: 'VARIABLE_ALIAS',
            id: alphaVar.id
          });
          console.log('[MAPPED LIGHT]', tokenName, '→', alphaVarName);
        }
      } else if (lightValue.startsWith('GRAY-ALPHA:')) {
        var grayAlphaStep = parseInt(lightValue.replace('GRAY-ALPHA:', ''));
        var grayAlphaVar = allVariables.find(function(v) {
          return v.name === 'scale/gray-alpha-' + grayAlphaStep && v.variableCollectionId === collection.id;
        });
        if (grayAlphaVar) {
          variable.setValueForMode(customLightModeId, {
            type: 'VARIABLE_ALIAS',
            id: grayAlphaVar.id
          });
          console.log('[MAPPED LIGHT]', tokenName, '→ gray-alpha-' + grayAlphaStep);
        }
      } else if (lightValue.startsWith('ON-COLOR-ALPHA:')) {
        var onColorStep = parseInt(lightValue.replace('ON-COLOR-ALPHA:', ''));
        var onColorVar = allVariables.find(function(v) {
          return v.name === 'scale/on-color-alpha-' + onColorStep && v.variableCollectionId === collection.id;
        });
        if (onColorVar) {
          variable.setValueForMode(customLightModeId, {
            type: 'VARIABLE_ALIAS',
            id: onColorVar.id
          });
          console.log('[MAPPED LIGHT]', tokenName, '→ on-color-alpha-' + onColorStep);
        }
      }
    }
    
    // Dark 모드 처리
    if (mappedValue.dark) {
      var darkValue = mappedValue.dark;
      console.log('[DEBUG DARK]', tokenName, 'mapping:', darkValue);
      
      if (darkValue.startsWith('GRAY:')) {
        var grayStepDark = parseInt(darkValue.replace('GRAY:', ''));
        var grayVarNameDark = 'scale/gray-' + grayStepDark;
        var grayVarDark = allVariables.find(function(v) {
          return v.name === grayVarNameDark && v.variableCollectionId === collection.id;
        });
        if (grayVarDark) {
          variable.setValueForMode(customDarkModeId, {
            type: 'VARIABLE_ALIAS',
            id: grayVarDark.id
          });
          console.log('[MAPPED DARK]', tokenName, '→', grayVarNameDark);
        } else {
          console.log('[WARNING] Gray variable not found for DARK:', grayVarNameDark, 'for token:', tokenName);
        }
      } else if (darkValue.startsWith('REF:')) {
        var refStringDark = darkValue.replace('REF:', '');
        var stepDark;
        
        // themeName 길이만큼 잘라내고 남은 숫자 추출
        if (refStringDark.startsWith(theme.themeName)) {
          stepDark = parseInt(refStringDark.substring(theme.themeName.length));
        } else {
          // 숫자만 있는 경우 직접 파싱
          stepDark = parseInt(refStringDark);
        }
        
        if (stepDark) {
          var scaleVarNameDark = 'scale/' + theme.themeName + '-' + stepDark;
          var scaleVarDark = allVariables.find(function(v) {
            return v.name === scaleVarNameDark && v.variableCollectionId === collection.id;
          });
          
          if (scaleVarDark) {
            variable.setValueForMode(customDarkModeId, {
              type: 'VARIABLE_ALIAS',
              id: scaleVarDark.id
            });
            console.log('[MAPPED DARK]', tokenName, '→', scaleVarNameDark);
          }
        }
      } else if (darkValue.startsWith('ALPHA:')) {
        var alphaStepDark = parseInt(darkValue.replace('ALPHA:', '').replace(theme.themeName, ''));
        var alphaVarNameDark = 'scale/' + theme.themeName + '-alpha-' + alphaStepDark;
        var alphaVarDark = allVariables.find(function(v) {
          return v.name === alphaVarNameDark && v.variableCollectionId === collection.id;
        });
        if (alphaVarDark) {
          variable.setValueForMode(customDarkModeId, {
            type: 'VARIABLE_ALIAS',
            id: alphaVarDark.id
          });
          console.log('[MAPPED DARK]', tokenName, '→', alphaVarNameDark);
        }
      } else if (darkValue.startsWith('GRAY-ALPHA:')) {
        var grayAlphaStepDark = parseInt(darkValue.replace('GRAY-ALPHA:', ''));
        var grayAlphaVarDark = allVariables.find(function(v) {
          return v.name === 'scale/gray-alpha-' + grayAlphaStepDark && v.variableCollectionId === collection.id;
        });
        if (grayAlphaVarDark) {
          variable.setValueForMode(customDarkModeId, {
            type: 'VARIABLE_ALIAS',
            id: grayAlphaVarDark.id
          });
          console.log('[MAPPED DARK]', tokenName, '→ gray-alpha-' + grayAlphaStepDark);
        }
      } else if (darkValue.startsWith('ON-COLOR-ALPHA:')) {
        var onColorStepDark = parseInt(darkValue.replace('ON-COLOR-ALPHA:', ''));
        var onColorVarDark = allVariables.find(function(v) {
          return v.name === 'scale/on-color-alpha-' + onColorStepDark && v.variableCollectionId === collection.id;
        });
        if (onColorVarDark) {
          variable.setValueForMode(customDarkModeId, {
            type: 'VARIABLE_ALIAS',
            id: onColorVarDark.id
          });
          console.log('[MAPPED DARK]', tokenName, '→ on-color-alpha-' + onColorStepDark);
        }
      }
    }
    
    createdCount++;
  }

  // preserve 토큰 처리
  for (var j = 0; j < preserveTokensList.length; j++) {
    var preserveTokenName = preserveTokensList[j];
    if (!dynamicMappings[preserveTokenName]) {
      var preserveVar = await findOrCreateVariable(preserveTokenName, collection, 'COLOR');
      var originalValues = preserveOriginalValues[preserveTokenName];
      if (originalValues) {
        if (originalValues.light) {
          preserveVar.setValueForMode(customLightModeId, originalValues.light);
        }
        if (originalValues.dark) {
          preserveVar.setValueForMode(customDarkModeId, originalValues.dark);
        }
        console.log('[PRESERVE]', preserveTokenName);
      }
    }
  }

  console.log('[STEP 6 COMPLETE] Processed', createdCount, 'semantic tokens');
  
  // =====================================
  // STEP 7: 결과 보고
  // =====================================
  
  console.log('=== Theme Creation Complete ===');
  console.log('Created:', createdCount, 'Skipped:', skippedCount);
  
  figma.ui.postMessage({ 
    type: 'custom-theme-created',
    success: true,
    count: createdCount,
    skipped: skippedCount,
    themeName: theme.themeName
  });
  
  figma.notify('Created ' + createdCount + ' variables for ' + theme.themeName);
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

// =====================================
// 메인 메시지 핸들러
// =====================================

figma.ui.onmessage = async function(msg) {
  console.log('Received message:', msg.type);
  
  try {
    if (msg.type === 'create-variables') {
      await handleCreateVariables(msg);
    } else if (msg.type === 'create-styles') {
      await handleCreateStyles(msg);
    } else if (msg.type === 'create-custom-theme') {
      await handleCreateCustomTheme(msg);
    } else if (msg.type === 'apply-custom-mode-to-frame') {
      await handleApplyCustomModeToFrame(msg);
    } else if (msg.type === 'generate-tone-matching') {
      await handleToneMatching(msg);
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
    message: 'Plugin initialized successfully' 
  });
  console.log('Ready message sent');
}, 100);

console.log('Backend script loaded successfully');