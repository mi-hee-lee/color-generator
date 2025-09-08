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

// 통합 동적 매핑 함수
function getDynamicMappings(closestStep, themeName, applicationMode, baseColor) {
  var mappings = {};
  
  // 200 기준으로 분류하되, baseColor가 밝은 색상이면 light range에 포함
  var isLightRange = closestStep < 200;
  if (baseColor) {
    var hsl = hexToHsl(baseColor);
    var lightness = hsl[2];
    var hue = hsl[0];
    
    // 밝기가 70% 이상이면 light range로 분류
    if (lightness >= 70) {
      isLightRange = true;
    }
    
    // BornBright 색상 (Hue 40°-190°, 대비비 < 2.0인 본질적으로 밝은 색상)도 light range로 분류
    if (hue >= 40 && hue <= 190) {
      isLightRange = true;
    }
  }
  
  console.log('[MAPPING] closestStep:', closestStep);
  console.log('[MAPPING] baseColor lightness:', baseColor ? hexToHsl(baseColor)[2] : 'N/A');
  console.log('[MAPPING] baseColor hue:', baseColor ? hexToHsl(baseColor)[0] : 'N/A');
  console.log('[MAPPING] Range:', isLightRange ? '밝은 범위 (200 미만 또는 밝은 색상 또는 BornBright)' : '어두운 범위');

  // =====================================
  // 옵션 1: forground 중심
  // =====================================
  if (applicationMode === 'accent-on-bg-off') {
    if (isLightRange) {
      // 밝은 범위 (Step<200 OR L≥70% OR BornBright(40°≤H≤190°))
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/secondary'] = 'GRAY:100';
      mappings['semantic/text/tertiary'] = 'GRAY:200';
      mappings['semantic/text/disabled'] = 'GRAY:600';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + '700';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
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
      // 어두운 범위 (Step≥200 AND L<70% AND NOT BornBright)
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + '100';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'REF:' + themeName + '100';
      mappings['semantic/border/line'] = 'REF:' + themeName + '200';
      mappings['semantic/border/line-disabled'] = 'REF:' + themeName + '100';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '100';
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + adjustStep(closestStep, 2);
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
    }
    
  // =====================================
  // 옵션 3: forground 중심 white bg
  // =====================================
  } else if (applicationMode === 'accent-on-bg-fixed') {
    mappings['semantic/background/default'] = 'GRAY:50';
    
    if (isLightRange) {
      // 밝은 범위 (Step<200 OR L≥70% OR BornBright(40°≤H≤190°))
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'REF:' + themeName + '100';
      mappings['semantic/border/line'] = 'REF:' + themeName + '200';
      mappings['semantic/border/line-disabled'] = 'REF:' + themeName + '100';
      
      mappings['semantic/fill/silent'] = 'GRAY:50';
      mappings['semantic/fill/silent-hover'] = 'GRAY:100';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:100';
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + adjustStep(closestStep, 4);
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 3);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStep, 3);
      
    } else {
      // 어두운 범위 (Step≥200 AND L<70% AND NOT BornBright)
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:100';
      mappings['semantic/border/line'] = 'GRAY:200';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'GRAY:50';
      mappings['semantic/fill/silent-hover'] = 'GRAY:100';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:100';
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + closestStep;
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
    }
    
  // =====================================
  // 옵션 2: background 중심
  // =====================================
  } else if (applicationMode === 'accent-off-bg-on') {
    if (isLightRange) {
      // 밝은 범위 (Step<200 OR L≥70% OR BornBright(40°≤H≤190°))
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + closestStep;
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + '400';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + '500';
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + '500';
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + '400';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + '400';
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + '500';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '600';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '600';
      
    } else {
      // 어두운 범위 (Step≥200 AND L<70% AND NOT BornBright)
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/secondary'] = 'ON-COLOR-ALPHA:800';
      mappings['semantic/text/tertiary'] = 'ON-COLOR-ALPHA:700';
      mappings['semantic/text/disabled'] = 'ON-COLOR-ALPHA:500';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + closestStep;
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + '100';
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + '50';
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + '50';
      mappings['semantic/border/divider'] = 'ON-COLOR-ALPHA:200';
      mappings['semantic/border/line'] = 'ON-COLOR-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'ON-COLOR-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + '100';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '200';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '200';
    }
  
  // =====================================
  // 옵션 4: forground 중심 black bg
  // =====================================
  } else if (applicationMode === 'accent-on-bg-black') {
    // 배경은 항상 black으로 고정
    mappings['semantic/background/default'] = 'GRAY:950';
    
    if (isLightRange) {
      // 밝은 범위 - 어두운 배경에 맞는 텍스트 색상
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/secondary'] = 'GRAY:100';
      mappings['semantic/text/tertiary'] = 'GRAY:200';
      mappings['semantic/text/disabled'] = 'GRAY:600';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
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
      // 어두운 범위 - 어두운 배경이지만 밝은 텍스트 사용 (흰 배경 대비)
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/secondary'] = 'GRAY:100';
      mappings['semantic/text/tertiary'] = 'GRAY:200';
      mappings['semantic/text/disabled'] = 'GRAY:600';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'ON-COLOR-ALPHA:100';
      mappings['semantic/border/line'] = 'ON-COLOR-ALPHA:200';
      mappings['semantic/border/line-disabled'] = 'ON-COLOR-ALPHA:100';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '300';
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + '200';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '200';
      
      mappings['semantic/common/attention'] = 'REF:' + themeName + '700';
      mappings['semantic/common/attention-pressed'] = 'REF:' + themeName + '600';
      mappings['semantic/common/attention-hover'] = 'REF:' + themeName + '600';
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
  
  // 각 단계별 alpha 토큰 생성 (50, 75, 150 제외)
  for (var i = 0; i < theme.scaleColors.light.length; i++) {
    var step = theme.scaleColors.light[i].step;
    
    // 50, 75, 150은 건너뛰기
    if (step === 50 || step === 75 || step === 150) continue;
    
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
  
  // Semantic 토큰 생성 제거 - 오직 scale 토큰만 생성
  
  figma.notify('Created ' + createdCount + ' variables for ' + theme.themeName);
}

// 테마 토큰을 Layer에 직접 적용하는 핸들러 (semantic 토큰 변경 없이)
async function handleApplyThemeColorsToFrame(msg) {
  var theme = msg.theme;
  var applicationMode = theme.applicationMode || 'accent-on-bg-off';
  var selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.notify('Frame을 선택해주세요');
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
  var mappings = getDynamicMappings(closestStep, theme.themeName, applicationMode, theme.baseColor);
  
  // 모든 변수 가져오기
  var allVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  var appliedCount = 0;
  
  console.log('=== 매핑 정보 (closestStep: ' + closestStep + ', mode: ' + applicationMode + ') ===');
  for (var tokenName in mappings) {
    console.log(tokenName + ' → ' + mappings[tokenName]);
  }
  
  // 매핑 값에서 실제 토큰을 찾는 함수
  function findTokenFromMapping(mappingValue) {
    if (!mappingValue) return null;
    
    console.log('findTokenFromMapping called with:', mappingValue);
    
    if (mappingValue.startsWith('REF:')) {
      var refString = mappingValue.replace('REF:', '');
      console.log('refString:', refString, 'themeName:', theme.themeName);
      
      var step;
      
      if (refString.startsWith(theme.themeName)) {
        var stepString = refString.substring(theme.themeName.length);
        console.log('stepString after substring:', stepString);
        step = parseInt(stepString);
      } else {
        step = parseInt(refString);
      }
      
      console.log('parsed step:', step);
      
      if (step) {
        var scaleVarName = 'scale/' + theme.themeName + '-' + step;
        console.log('looking for scaleVarName:', scaleVarName);
        var foundVar = allVariables.find(function(v) {
          return v.name === scaleVarName && v.variableCollectionId === collection.id;
        });
        console.log('found variable:', foundVar ? foundVar.name : 'null');
        return foundVar;
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
    }
    
    // 기본 fallback 컬러
    return { r: 1, g: 1, b: 1 };
  }
  
  // 노드의 모든 토큰을 재귀적으로 교체하는 함수
  function replaceTokensInNode(node, depth) {
    var indent = '';
    for (var d = 0; d < depth; d++) indent += '  ';
    
    console.log(indent + '=== Processing:', node.type, node.name, '===');
    
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
            console.log(indent + '[FOUND SEMANTIC]', currentVar.name, 'in fill');
            
            // 매핑에서 대응하는 토큰 찾기
            var mappedValue = mappings[currentVar.name];
            if (mappedValue) {
              console.log(indent + '[MAPPING]', currentVar.name, '→', mappedValue);
              var newToken = findTokenFromMapping(mappedValue);
              if (newToken) {
                var fallbackColor = getFallbackColor(mappedValue);
                
                // 토큰 교체 - fills 배열 전체 복사 후 수정
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
                
                console.log(indent + '[REPLACED]', currentVar.name, '→', newToken.name);
                appliedCount++;
              } else {
                console.log(indent + '[ERROR] Token not found for mapping:', mappedValue);
              }
            } else {
              console.log(indent + '[NO MAPPING]', currentVar.name);
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
            console.log(indent + '[FOUND SEMANTIC]', currentStrokeVar.name, 'in stroke');
            
            // 매핑에서 대응하는 토큰 찾기
            var strokeMappedValue = mappings[currentStrokeVar.name];
            if (strokeMappedValue) {
              console.log(indent + '[MAPPING]', currentStrokeVar.name, '→', strokeMappedValue);
              var newStrokeToken = findTokenFromMapping(strokeMappedValue);
              if (newStrokeToken) {
                var strokeFallbackColor = getFallbackColor(strokeMappedValue);
                
                // 토큰 교체 - strokes 배열 전체 복사 후 수정
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
                
                console.log(indent + '[REPLACED]', currentStrokeVar.name, '→', newStrokeToken.name);
                appliedCount++;
              } else {
                console.log(indent + '[ERROR] Token not found for mapping:', strokeMappedValue);
              }
            } else {
              console.log(indent + '[NO MAPPING]', currentStrokeVar.name);
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
            console.log(indent + '[FOUND SEMANTIC]', currentEffectVar.name, 'in effect');
            
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
                
                console.log(indent + '[REPLACED]', currentEffectVar.name, '→', newEffectToken.name);
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
    console.log('\n=== 처리 시작:', node.name, '===');
    replaceTokensInNode(node, 0);
  }
  
  console.log('\n=== 적용 완료 ===');
  figma.notify('테마 토큰이 ' + appliedCount + '개 요소에 적용됨 (semantic 토큰 변경 없음)');
}

// Semantic 토큰을 프레임에 적용하는 핸들러
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
  
  // semantic 변수들 가져오기
  var allVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  var backgroundVar = allVariables.find(function(v) {
    return v.name === 'semantic/background/default' && v.variableCollectionId === collection.id;
  });
  
  var appliedCount = 0;
  
  // 선택된 Frame들에 적용
  for (var i = 0; i < selection.length; i++) {
    var node = selection[i];
    
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      // 배경색 적용
      if (backgroundVar && 'fills' in node) {
        node.fills = [{
          type: 'SOLID',
          boundVariables: {
            'color': {
              type: 'VARIABLE_ALIAS',
              id: backgroundVar.id
            }
          }
        }];
        appliedCount++;
      }
    }
  }
  
  figma.notify('Semantic 토큰이 ' + appliedCount + '개 Frame에 적용되었습니다');
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
    } else if (msg.type === 'apply-semantic-to-frame') {
      await handleApplySemanticToFrame(msg);
    } else if (msg.type === 'apply-theme-colors-to-frame') {
      await handleApplyThemeColorsToFrame(msg);
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