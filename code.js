// Figma Plugin Backend Code - Version 12 (Complete Custom Theme Logic)
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
function setSaturation(hex, targetSaturation) {
  var hsl = hexToHsl(hex);
  hsl[1] = Math.min(hsl[1], targetSaturation);
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

// HEX를 RGB로 변환 (간단한 버전)
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

// =====================================
// 유틸리티 함수들
// =====================================

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
  
  for (var i = 0; i < scaleColors.length; i++) {
    var scaleHsl = hexToHsl(scaleColors[i].hex);
    var diff = Math.abs(scaleHsl[2] - inputLightness);
    if (diff < minDifference) {
      minDifference = diff;
      closestStep = scaleColors[i].step;
    }
  }
  
  console.log('[CLOSEST] Input L:', inputLightness.toFixed(2), '→ Step:', closestStep, 'Diff:', minDifference.toFixed(2));
  return closestStep;
}

// =====================================
// 동적 매핑 함수
// =====================================

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

// Light 모드 동적 매핑 (200/300 기준)
function getDynamicMappingsLight(closestStepLight, themeName, applicationMode) {
  var mappings = {};
  
  // 200/300 기준으로 분류
  var isLightRange = closestStepLight <= 200;
  var isMidRange = closestStepLight >= 300;
  
  console.log('[LIGHT CLASSIFICATION] closestStep:', closestStepLight);
  console.log('[LIGHT CLASSIFICATION] Range:', isLightRange ? '200 이하' : isMidRange ? '300 이상' : '중간값(에러)');
  
  if (applicationMode === 'accent-on-bg-off') {
    if (isMidRange) {
      // 300 이상
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      mappings['semantic/background/default'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/common/attention'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
    
    
    } else {
      // 200 이하
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/secondary'] = 'GRAY:100';
      mappings['semantic/text/tertiary'] = 'GRAY:200';
      mappings['semantic/text/disabled'] = 'GRAY:600';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      mappings['semantic/background/default'] = 'REF:' + themeName + '300';
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '300';
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/common/attention'] = 'REF:' + themeName + '100';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '200';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '200';
    }
  } else if (applicationMode === 'accent-on-bg-fixed') {
    if (isMidRange) {
      // 300 이상
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);

      mappings['semantic/common/attention'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, -1);
   
    } else {
      // 200 이하
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepLight, 1);


    }
    mappings['semantic/background/default'] = 'GRAY:50';
    mappings['semantic/fill/silent'] = 'GRAY:50';
    mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepLight;
    mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStepLight;
    mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStepLight;
    

  } else if (applicationMode === 'accent-off-bg-on') {
    if (isMidRange) {
      // 300 이상
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/secondary'] = 'GRAY:100';
      mappings['semantic/text/tertiary'] = 'GRAY:200';
      mappings['semantic/text/disabled'] = 'GRAY:600';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      mappings['semantic/background/default'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/fill/silent'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/fill/primary'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + '100';

      mappings['semantic/common/attention'] = 'REF:' + themeName + '100';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '200';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '200';


      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + '50';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + '50';
    } else {
      // 200 이하
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      mappings['semantic/background/default'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/fill/silent'] = 'REF:' + themeName + closestStepLight;
      mappings['semantic/fill/primary'] = 'REF:' + themeName + '400';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + '500';
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + '500';

      mappings['semantic/common/attention'] = 'REF:' + themeName + '500';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '600';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '600';

      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + '400';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + '400';
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

// Dark 모드 동적 매핑 (300/400 기준)
function getDynamicMappingsDark(closestStepDark, themeName, applicationMode) {
  var mappings = {};
  
  // 300/400 기준으로 분류
  var isLightRange = closestStepDark <= 300;
  var isMidRange = closestStepDark >= 400;
  
  console.log('[DARK CLASSIFICATION] closestStep:', closestStepDark);
  console.log('[DARK CLASSIFICATION] Range:', isLightRange ? '300 이하' : isMidRange ? '400 이상' : '중간값(에러)');
  
  if (applicationMode === 'accent-on-bg-off') {
    if (isMidRange) {
      // 400 이상
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      mappings['semantic/background/default'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, -1);
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, -1);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, -1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStepDark;
    } else {
      // 300 이하
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      mappings['semantic/background/default'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      mappings['semantic/common/attention'] = 'REF:' + themeName + '100';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '200';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '200';
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStepDark;
    }
  } else if (applicationMode === 'accent-on-bg-fixed') {
    if (isMidRange) {
      // 400 이상
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, -1);
      mappings['semantic/common/attention'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, -1);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, -1);
    } else {
      // 300 이하
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      mappings['semantic/common/attention'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStepDark, 1);
    }
    mappings['semantic/background/default'] = 'GRAY:50';
    mappings['semantic/fill/silent'] = 'GRAY:50';
    mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStepDark;
    mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStepDark;
    mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStepDark;
  } else if (applicationMode === 'accent-off-bg-on') {
    if (isMidRange) {
      // 400 이상
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      mappings['semantic/background/default'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/fill/silent'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/fill/primary'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + '100';
      mappings['semantic/common/attention'] = 'REF:' + themeName + '100';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '200';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '200';
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + '50';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + '50';
    } else {
      // 300 이하
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/secondary'] = 'GRAY:100';
      mappings['semantic/text/tertiary'] = 'GRAY:200';
      mappings['semantic/text/disabled'] = 'GRAY:600';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      mappings['semantic/background/default'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/fill/silent'] = 'REF:' + themeName + closestStepDark;
      mappings['semantic/fill/primary'] = 'REF:' + themeName + '400';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + '500';
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + '500';
      mappings['semantic/common/attention'] = 'REF:' + themeName + '500';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '600';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '600';
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + '50';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + '50';
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
    // 단일 모드 처리 (기존 코드)
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
    dualMode: msg.dualMode
  });
}

// 스타일 생성 핸들러 추가
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

// Auto Apply 기능 핸들러 추가
async function handleApplyColorsToLayers(msg) {
  var selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.notify('Please select layers to apply colors');
    return;
  }
  
  var appliedCount = 0;
  var layerMappings = msg.layerMappings;
  
  // 선택된 노드들에 색상 적용
  for (var i = 0; i < selection.length; i++) {
    var node = selection[i];
    
    // 레이어 이름에서 매칭되는 키워드 찾기
    var layerName = node.name.toLowerCase();
    var matchedColor = null;
    
    for (var keyword in layerMappings) {
      if (layerName.includes(keyword)) {
        matchedColor = layerMappings[keyword];
        break;
      }
    }
    
    if (matchedColor && 'fills' in node) {
      var rgb = hexToFigmaRGB(matchedColor.hex);
      
      if (msg.previewMode) {
        // 프리뷰 모드: 반투명으로 적용
        node.fills = [{
          type: 'SOLID',
          color: rgb,
          opacity: 0.5
        }];
      } else {
        // 실제 적용
        node.fills = [{
          type: 'SOLID',
          color: rgb
        }];
      }
      
      appliedCount++;
    }
  }
  
  var message = msg.previewMode ? 
    'Preview applied to ' + appliedCount + ' layers' :
    'Colors applied to ' + appliedCount + ' layers';
    
  figma.notify(message);
  
  figma.ui.postMessage({
    type: 'colors-applied',
    success: true,
    count: appliedCount,
    previewMode: msg.previewMode
  });
}

// 메시지 핸들러에 새 케이스 추가
figma.ui.onmessage = async function(msg) {
  console.log('Received message:', msg.type);
  
  try {
    if (msg.type === 'create-variables') {
      await handleCreateVariables(msg);
    } else if (msg.type === 'create-styles') {
      await handleCreateStyles(msg);
    } else if (msg.type === 'apply-colors-to-layers') {
      await handleApplyColorsToLayers(msg);
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

// Custom Theme 생성 핸들러 (수정된 Application Mode 지원)
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
  // STEP 2: Scale 색상 생성 (scale/{themeName}{step})
  // =====================================
  
  console.log('=== Creating Scale Variables ===');
  
  for (var i = 0; i < theme.scaleColors.light.length; i++) {
    var lightColor = theme.scaleColors.light[i];
    var darkColor = theme.scaleColors.dark[i];
    var variableName = 'scale/' + theme.themeName + lightColor.step;
    
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
  // STEP 3: Alpha 색상 생성 (scale/{themeName}-alpha-{step})
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

// 각 단계별 alpha 토큰 생성
for (var i = 0; i < theme.scaleColors.light.length; i++) {
  var step = theme.scaleColors.light[i].step;
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

  // =====================================
  // STEP 4: 기존 변수 복사 (gray 등 비시맨틱)
  // =====================================
  
  console.log('=== Copying Non-Semantic Variables ===');
  
  var allVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  
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

// 두 매핑을 합치기
var dynamicMappings = {};
for (var key in lightMappings) {
  if (key.startsWith('semantic/fill/tertiary') || key.startsWith('semantic/fill/disabled') || key.startsWith('semantic/fill/surface-contents')) {
    // 알파 토큰은 light/dark 동일
    dynamicMappings[key] = { light: lightMappings[key], dark: darkMappings[key] };
  } else {
    dynamicMappings[key] = { 
      light: lightMappings[key], 
      dark: darkMappings[key] 
    };
  }
}
  // =====================================
  // STEP 6: Semantic 토큰 생성 및 매핑
  // =====================================
  
  console.log('=== Applying Semantic Mappings ===');
  
  // 보존해야 할 토큰 목록
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
  
  // 모든 변수 다시 로드 (새로 생성된 것 포함)
  allVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  
  // STEP 6: Semantic 토큰 생성 및 매핑 부분에서
for (var i = 0; i < theme.semanticTokens.length; i++) {
    var token = theme.semanticTokens[i];
    var variable = await findOrCreateVariable(token.name, collection, 'COLOR');
  
    // 동적 매핑 확인
    var mappedValue = dynamicMappings[token.name];
    
    if (mappedValue) {
      // GRAY: 프리픽스 처리
      if (mappedValue.light && mappedValue.light.startsWith('GRAY:')) {
        var grayStep = parseInt(mappedValue.light.replace('GRAY:', ''));
        var grayVariableName = 'scale/gray' + grayStep;
        
        var grayVar = allVariables.find(function(v) {
          return v.name === grayVariableName && v.variableCollectionId === collection.id;
        });
        
        if (grayVar) {
          variable.setValueForMode(customLightModeId, {
            type: 'VARIABLE_ALIAS',
            id: grayVar.id
          });
        } else {
          console.log('[SKIP]', token.name, 'missing-gray-variable', grayVariableName);
          skippedCount++;
        }
      }
      
      // GRAY-ALPHA: 프리픽스 처리 (추가)
      if (mappedValue.light && mappedValue.light.startsWith('GRAY-ALPHA:')) {
        var grayAlphaStep = parseInt(mappedValue.light.replace('GRAY-ALPHA:', ''));
        var grayAlphaVariableName = 'scale/gray-alpha-' + grayAlphaStep;
        
        var grayAlphaVar = allVariables.find(function(v) {
          return v.name === grayAlphaVariableName && v.variableCollectionId === collection.id;
        });
        
        if (grayAlphaVar) {
          variable.setValueForMode(customLightModeId, {
            type: 'VARIABLE_ALIAS',
            id: grayAlphaVar.id
          });
        } else {
          console.log('[SKIP]', token.name, 'missing-gray-alpha-variable', grayAlphaVariableName);
          skippedCount++;
        }
      }
      
      if (mappedValue.dark && mappedValue.dark.startsWith('GRAY:')) {
        var grayStepDark = parseInt(mappedValue.dark.replace('GRAY:', ''));
        var grayVariableNameDark = 'scale/gray' + grayStepDark;
        
        var grayVarDark = allVariables.find(function(v) {
          return v.name === grayVariableNameDark && v.variableCollectionId === collection.id;
        });
        
        if (grayVarDark) {
          variable.setValueForMode(customDarkModeId, {
            type: 'VARIABLE_ALIAS',
            id: grayVarDark.id
          });
        } else {
          console.log('[SKIP]', token.name, 'missing-gray-variable-dark', grayVariableNameDark);
          skippedCount++;
        }
      }
      
      // GRAY-ALPHA: 프리픽스 처리 Dark (추가)
      if (mappedValue.dark && mappedValue.dark.startsWith('GRAY-ALPHA:')) {
        var grayAlphaStepDark = parseInt(mappedValue.dark.replace('GRAY-ALPHA:', ''));
        var grayAlphaVariableNameDark = 'scale/gray-alpha-' + grayAlphaStepDark;
        
        var grayAlphaVarDark = allVariables.find(function(v) {
          return v.name === grayAlphaVariableNameDark && v.variableCollectionId === collection.id;
        });
        
        if (grayAlphaVarDark) {
          variable.setValueForMode(customDarkModeId, {
            type: 'VARIABLE_ALIAS',
            id: grayAlphaVarDark.id
          });
        } else {
          console.log('[SKIP]', token.name, 'missing-gray-alpha-variable-dark', grayAlphaVariableNameDark);
          skippedCount++;
        }
      }
      
      // REF: 프리픽스 처리 - 값 복사 방식 (alias 아님)
      if (mappedValue.light && mappedValue.light.startsWith('REF:')) {
        // Light 모드 처리
        var lightRefInfo = mappedValue.light.replace('REF:', '');
        var lightStep = parseInt(lightRefInfo.match(/\d+$/)[0]);
        var lightColor = theme.scaleColors.light.find(function(c) { return c.step === lightStep; });
        
        if (lightColor) {
          variable.setValueForMode(customLightModeId, hexToFigmaRGB(lightColor.hex));
        } else {
          console.log('[SKIP]', token.name, 'missing-scale-color-light', lightStep);
          skippedCount++;
        }
      }
      
      if (mappedValue.dark && mappedValue.dark.startsWith('REF:')) {
        // Dark 모드 처리
        var darkRefInfo = mappedValue.dark.replace('REF:', '');
        var darkStep = parseInt(darkRefInfo.match(/\d+$/)[0]);
        var darkColor = theme.scaleColors.dark.find(function(c) { return c.step === darkStep; });
        
        if (darkColor) {
          variable.setValueForMode(customDarkModeId, hexToFigmaRGB(darkColor.hex));
        } else {
          console.log('[SKIP]', token.name, 'missing-scale-color-dark', darkStep);
          skippedCount++;
        }
      }
      
      // ALPHA: 프리픽스 처리
      if (mappedValue.light && mappedValue.light.startsWith('ALPHA:')) {
        var alphaInfo = mappedValue.light.replace('ALPHA:', '');
        var step = parseInt(alphaInfo.match(/\d+$/)[0]);
        var alphaVariableName = 'scale/' + theme.themeName + '-alpha-' + step;
        
        var alphaVar = allVariables.find(function(v) {
          return v.name === alphaVariableName && v.variableCollectionId === collection.id;
        });
        
        if (alphaVar) {
          variable.setValueForMode(customLightModeId, {
            type: 'VARIABLE_ALIAS',
            id: alphaVar.id
          });
          variable.setValueForMode(customDarkModeId, {
            type: 'VARIABLE_ALIAS',
            id: alphaVar.id
          });
          console.log('[SEM]', token.name, 'CustomLight/Dark', 'ALPHA', step);
        } else {
          console.log('[SKIP]', token.name, 'missing-alpha-variable', alphaVariableName);
          skippedCount++;
        }
      }
    } else if (preserveTokens.indexOf(token.name) !== -1) {
      // 보존 토큰 처리 - 기존 값도 alias로 연결
      if (baseLightMode && variable.valuesByMode[baseLightMode.modeId]) {
        // 기존 Light/Dark 모드의 값이 변수 참조인지 확인
        var existingValue = variable.valuesByMode[baseLightMode.modeId];
        if (existingValue && existingValue.type === 'VARIABLE_ALIAS') {
          // 이미 변수 참조인 경우 그대로 사용
          variable.setValueForMode(customLightModeId, existingValue);
        } else {
          // 직접 값인 경우 그대로 복사
          variable.setValueForMode(customLightModeId, existingValue);
        }
      }
      if (baseDarkMode && variable.valuesByMode[baseDarkMode.modeId]) {
        var existingValue = variable.valuesByMode[baseDarkMode.modeId];
        if (existingValue && existingValue.type === 'VARIABLE_ALIAS') {
          variable.setValueForMode(customDarkModeId, existingValue);
        } else {
          variable.setValueForMode(customDarkModeId, existingValue);
        }
      }
      console.log('[SEM]', token.name, 'CustomLight/Dark', 'PRESERVE', 'base-value');
    } else {
      // 일반 토큰 - UI에서 제공한 값에서 가장 가까운 scale 찾아 참조
      var lightHex = token.light;
      var darkHex = token.dark;
      
      // Light 값에 대한 가장 가까운 scale step 찾기
      var lightStep = null;
      var minLightDiff = Infinity;
      for (var j = 0; j < theme.scaleColors.light.length; j++) {
        if (theme.scaleColors.light[j].hex === lightHex) {
          lightStep = theme.scaleColors.light[j].step;
          break;
        }
      }
      
      // Dark 값에 대한 가장 가까운 scale step 찾기
      var darkStep = null;
      for (var j = 0; j < theme.scaleColors.dark.length; j++) {
        if (theme.scaleColors.dark[j].hex === darkHex) {
          darkStep = theme.scaleColors.dark[j].step;
          break;
        }
      }
      
      // scale 변수 참조 설정
      if (lightStep !== null) {
        var lightScaleVar = allVariables.find(function(v) {
          return v.name === 'scale/' + theme.themeName + lightStep && v.variableCollectionId === collection.id;
        });
        if (lightScaleVar) {
          variable.setValueForMode(customLightModeId, {
            type: 'VARIABLE_ALIAS',
            id: lightScaleVar.id
          });
        } else {
          variable.setValueForMode(customLightModeId, hexToFigmaRGB(lightHex));
        }
      } else {
        variable.setValueForMode(customLightModeId, hexToFigmaRGB(lightHex));
      }
      
      if (darkStep !== null) {
        var darkScaleVar = allVariables.find(function(v) {
          return v.name === 'scale/' + theme.themeName + darkStep && v.variableCollectionId === collection.id;
        });
        if (darkScaleVar) {
          variable.setValueForMode(customDarkModeId, {
            type: 'VARIABLE_ALIAS',
            id: darkScaleVar.id
          });
        } else {
          variable.setValueForMode(customDarkModeId, hexToFigmaRGB(darkHex));
        }
      } else {
        variable.setValueForMode(customDarkModeId, hexToFigmaRGB(darkHex));
      }
      
      console.log('[SEM]', token.name, 'CustomLight/Dark', 'DEFAULT-ALIAS', 
                  lightStep !== null ? lightStep : 'direct', 
                  darkStep !== null ? darkStep : 'direct');
    }
    
    createdCount++;
  }
  
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