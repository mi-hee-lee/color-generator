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

// =====================================
// 동적 매핑 함수들
// =====================================

// 통합 동적 매핑 함수
function getDynamicMappings(closestStep, themeName, applicationMode, baseColor) {
  var mappings = {};
  
  console.log('[Backend] getDynamicMappings 호출됨 - closestStep:', closestStep, 'applicationMode:', applicationMode, 'baseColor:', baseColor);
  
  // 1단계: Hue의 본질적 밝기 판단
  function getHueBrightness(hue) {
    // Hue 범위별 본질적 밝기 분류
    
    // 매우 밝은 색상군
    if (hue >= 50 && hue <= 70) return 'very-bright';     // 노랑 (Yellow)
    if (hue >= 170 && hue <= 190) return 'very-bright';   // 청록 (Cyan)
    
    // 밝은 색상군  
    if (hue >= 70 && hue <= 150) return 'bright';         // 연두-초록 (Yellow-Green to Green)
    if (hue >= 150 && hue <= 170) return 'bright';        // 청록-초록 경계 (Green-Cyan)
    if (hue >= 30 && hue <= 50) return 'bright';          // 주황 (Orange)
    
    // 중간 색상군
    if (hue >= 190 && hue <= 210) return 'medium';        // 청록-파랑 경계 (Cyan-Blue)
    if (hue >= 20 && hue <= 30) return 'medium';          // 주황-빨강 경계
    
    // 어두운 색상군
    if (hue >= 210 && hue <= 240) return 'dark';          // 파랑 (Blue)
    if (hue >= 240 && hue <= 300) return 'dark';          // 보라 (Purple/Violet)
    if (hue >= 0 && hue <= 20 || hue >= 300) return 'dark'; // 빨강-자주 (Red-Magenta)
    
    return 'medium'; // 기본값
  }
  
  // 본질적 밝기 판단
  var isInherentlyBright = false;
  if (baseColor) {
    var hsl = hexToHsl(baseColor);
    var hue = hsl[0]; // Already in degrees
    var saturation = hsl[1]; // Already in percentage
    var lightness = hsl[2]; // Already in percentage
    var hueBrightness = getHueBrightness(hue);
    
    
    // 1) Lightness가 75% 이상이면 무조건 밝은 색상으로 분류
    if (lightness >= 75) {
      isInherentlyBright = true;
    } 
    // 2) 그렇지 않으면 Hue의 본질적 밝기로 판단
    else {
      // very-bright, bright까지를 본질적으로 밝은 색상으로 분류
      isInherentlyBright = (hueBrightness === 'very-bright' || hueBrightness === 'bright');
    }
    
  }
  
  // 2단계: 색상 범위 결정 (본질적 밝기에 따라 기준 조정)
  var colorRange;
  
  console.log('[Backend] 본질적 밝기 판단 - isInherentlyBright:', isInherentlyBright);
  
  if (isInherentlyBright) {
    // 태생이 밝은 색상
    if (closestStep <= 400) {
      colorRange = 'light';
    } else if (closestStep >= 500 && closestStep <= 700) {
      colorRange = 'medium';
    } else {
      colorRange = 'dark';  // 800-950
    }
  } else {
    // 태생이 어두운 색상
    if (closestStep < 300) {
      colorRange = 'light';
    } else if (closestStep >= 300 && closestStep <= 700) {
      colorRange = 'medium';
    } else {
      colorRange = 'dark';  // 800-950
    }
  }
  
  console.log('[Backend] 결정된 색상 범위 - colorRange:', colorRange, 'closestStep:', closestStep);
  
  
  // 기존 호환성을 위한 변수
  var isLightRange = colorRange === 'light';
  

  // =====================================
  // 옵션 1: foreground 중심
  // =====================================
  if (applicationMode === 'accent-on-bg-off') {
    console.log('[Backend] 옵션 1 (accent-on-bg-off) 실행 - colorRange:', colorRange);
    if (colorRange === 'light') {
      // 밝은 범위 (Step≤300 OR L≥80% OR BornBright(40°≤H≤190°))
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/selected'] = 'REF:' + themeName + closestStep;

      mappings['semantic/text/secondary'] = 'GRAY:300';
      mappings['semantic/text/tertiary'] = 'GRAY:400';
      mappings['semantic/text/disabled'] = 'GRAY:600';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + '950';
      mappings['semantic/fill/surface-contents'] = 'STATIC-WHITE-ALPHA:200';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'STATIC-WHITE-ALPHA:200';
      mappings['semantic/border/line'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'STATIC-WHITE-ALPHA:200';
      
      mappings['semantic/fill/silent'] =  'REF:' + themeName + '950';
      mappings['semantic/fill/silent-hover'] =  'REF:' + themeName + '900';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '900';
      
      mappings['semantic/common/accent'] = 'REF:' + themeName + '400';
      mappings['semantic/common/accent-pressed'] = 'REF:' + themeName + '300';
      mappings['semantic/common/accent-hover'] = 'REF:' + themeName + '300';
      mappings['semantic/common/muted'] = 'STATIC-WHITE-ALPHA:400';
      
      mappings['semantic/fill/tertiary'] = 'STATIC-WHITE-ALPHA:400';
      mappings['semantic/fill/tertiary-hover'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/tertiary-pressed'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/disabled'] = 'STATIC-WHITE-ALPHA:200';
      
    } else if (colorRange === 'medium') {
      // 중간 범위 (Step 400-600)
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/selected'] = 'GRAY:900';

      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:100';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);

     mappings['semantic/border/divider-strong'] = 'GRAY:900';
      mappings['semantic/border/line-selected'] = 'GRAY:900';
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + '150';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '150';
      
      mappings['semantic/common/accent'] = 'ORANGE-RED-400';
      mappings['semantic/common/accent-pressed'] = 'ORANGE-RED-500';
      mappings['semantic/common/accent-hover'] = 'ORANGE-RED-500';
      mappings['semantic/common/muted'] = 'GRAY:300';
      
      mappings['semantic/fill/tertiary'] = 'GRAY-ALPHA:300';
      mappings['semantic/fill/tertiary-hover'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/tertiary-pressed'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/disabled'] = 'GRAY-ALPHA:200';
      
    } else {
      // 어두운 범위 (Step 700-950)
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/selected'] = 'REF:' + themeName + closestStep;

      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:100';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);

     mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + '150';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '150';
      
      mappings['semantic/common/accent'] = 'REF:' + themeName + adjustStep(closestStep, 2);
      mappings['semantic/common/accent-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/common/accent-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/common/muted'] = 'GRAY:300';
      
      mappings['semantic/fill/tertiary'] = 'GRAY-ALPHA:300';
      mappings['semantic/fill/tertiary-hover'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/tertiary-pressed'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/disabled'] = 'GRAY-ALPHA:200';
    }
    
  // =====================================
  // 옵션 2: background 중심
  // =====================================
  } else if (applicationMode === 'accent-off-bg-on') {
    if (colorRange === 'light') {
      // 밝은 범위 (Step≤300 OR L≥80% OR BornBright(40°≤H≤190°))
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/selected'] = 'GRAY:900';

      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/default'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:150';
      
      mappings['semantic/fill/primary'] = 'GRAY:950';
      mappings['semantic/fill/primary-hover'] = 'GRAY:900';
      mappings['semantic/fill/primary-pressed'] =  'GRAY:900';
      
      mappings['semantic/border/divider-strong'] = 'GRAY:950';
      mappings['semantic/border/line-selected'] = 'GRAY:950';
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/common/accent'] =  'REF:' + themeName + adjustStep(closestStep, 6);
      mappings['semantic/common/accent-pressed'] =  'REF:' + themeName + adjustStep(closestStep, 5);
      mappings['semantic/common/accent-hover'] = 'REF:' + themeName + adjustStep(closestStep, 5);
      mappings['semantic/common/muted'] = 'GRAY-ALPHA:300';
      
      mappings['semantic/fill/tertiary'] = 'GRAY-ALPHA:100';
      mappings['semantic/fill/tertiary-hover'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/tertiary-pressed'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/disabled'] = 'GRAY-ALPHA:100';
      
    } else if (colorRange === 'medium') {
      // 중간 범위 (Step 400-600)
      mappings['semantic/text/primary'] = 'STATIC-WHITE-ALPHA:900';
      mappings['semantic/text/selected'] = 'STATIC-WHITE-ALPHA:900';

      mappings['semantic/text/secondary'] = 'STATIC-WHITE-ALPHA:800';
      mappings['semantic/text/tertiary'] = 'STATIC-WHITE-ALPHA:700';
      mappings['semantic/text/disabled'] = 'STATIC-WHITE-ALPHA:500';
      mappings['semantic/text/on-color'] = 'GRAY:900';

      mappings['semantic/background/default'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/surface-contents'] = 'STATIC-WHITE-ALPHA:200';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + '100';
      
      mappings['semantic/border/divider-strong'] = 'STATIC-WHITE-ALPHA:900';
      mappings['semantic/border/line-selected'] = 'STATIC-WHITE-ALPHA:900';
      mappings['semantic/border/divider'] = 'STATIC-WHITE-ALPHA:200';
      mappings['semantic/border/line'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'STATIC-WHITE-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/common/accent'] = 'REF:' + themeName + '100';
      mappings['semantic/common/accent-pressed'] = 'REF:' + themeName + '200';
      mappings['semantic/common/accent-hover'] = 'REF:' + themeName + '200';
      mappings['semantic/common/muted'] = 'GRAY-ALPHA:400';
      
      mappings['semantic/fill/tertiary'] = 'STATIC-WHITE-ALPHA:400';
      mappings['semantic/fill/tertiary-hover'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/tertiary-pressed'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/disabled'] = 'STATIC-WHITE-ALPHA:200';
      
    } else {
      // 어두운 범위 (Step 700-950)
      mappings['semantic/text/primary'] = 'STATIC-WHITE-ALPHA:900';
      mappings['semantic/text/selected'] = 'STATIC-WHITE-ALPHA:900';

      mappings['semantic/text/secondary'] = 'STATIC-WHITE-ALPHA:800';
      mappings['semantic/text/tertiary'] = 'STATIC-WHITE-ALPHA:700';
      mappings['semantic/text/disabled'] = 'STATIC-WHITE-ALPHA:500';
      mappings['semantic/text/on-color'] = 'GRAY:900';

      mappings['semantic/background/default'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/surface-contents'] = 'STATIC-WHITE-ALPHA:200';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + '50';
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + '100';
      
      mappings['semantic/border/divider-strong'] = 'STATIC-WHITE-ALPHA:900';
      mappings['semantic/border/line-selected'] = 'STATIC-WHITE-ALPHA:900';
      mappings['semantic/border/divider'] = 'STATIC-WHITE-ALPHA:200';
      mappings['semantic/border/line'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'STATIC-WHITE-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/common/accent'] = 'REF:' + themeName + '100';
      mappings['semantic/common/accent-pressed'] = 'REF:' + themeName + '200';
      mappings['semantic/common/accent-hover'] = 'REF:' + themeName + '200';
      mappings['semantic/common/muted'] = 'GRAY-ALPHA:400';
      
      mappings['semantic/fill/tertiary'] = 'STATIC-WHITE-ALPHA:400';
      mappings['semantic/fill/tertiary-hover'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/tertiary-pressed'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/disabled'] = 'STATIC-WHITE-ALPHA:200';
    }
    
  // =====================================
  // 옵션 3: foreground 중심 white bg
  // =====================================
  } else if (applicationMode === 'accent-on-bg-fixed') {
    console.log('[Backend] 옵션 3 (accent-on-bg-fixed) 실행 - colorRange:', colorRange);
    mappings['semantic/background/default'] = 'GRAY:50';
    
    if (colorRange === 'light') {
      // 밝은 범위 (Step≤300 OR L≥80% OR BornBright(40°≤H≤190°))
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/selected'] = 'GRAY:950';

      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:100';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/border/divider-strong'] = 'GRAY:950';
      mappings['semantic/border/line-selected'] = 'GRAY:950';
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
      
      mappings['semantic/fill/tertiary'] = 'GRAY:100';
      mappings['semantic/fill/tertiary-hover'] = 'GRAY:200';
      mappings['semantic/fill/tertiary-pressed'] = 'GRAY:200';
      mappings['semantic/fill/disabled'] = 'GRAY:150';
      
    } else if (colorRange === 'medium') {
      // 중간 범위 (Step 400-600)
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/selected'] = 'GRAY:900';

      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';

      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:100';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      
      mappings['semantic/border/divider-strong'] = 'GRAY:950';
      mappings['semantic/border/line-selected'] = 'GRAY:950';
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
      
      mappings['semantic/fill/tertiary'] = 'GRAY:100';
      mappings['semantic/fill/tertiary-hover'] = 'GRAY:200';
      mappings['semantic/fill/tertiary-pressed'] = 'GRAY:200';
      mappings['semantic/fill/disabled'] = 'GRAY:150';


      
    } else {
      // 어두운 범위 (Step 700-950)
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/selected'] = 'REF:' + themeName + closestStep;

      mappings['semantic/text/secondary'] = 'GRAY:700';
      mappings['semantic/text/tertiary'] = 'GRAY:600';
      mappings['semantic/text/disabled'] = 'GRAY:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';

      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:100';
      
      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'REF:' + themeName + '100';
      mappings['semantic/border/line'] = 'REF:' + themeName + '200';
      mappings['semantic/border/line-disabled'] = 'REF:' + themeName + '100';
      
      mappings['semantic/fill/silent'] = 'GRAY:50';
      mappings['semantic/fill/silent-hover'] = 'GRAY:75';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:75';

      mappings['semantic/common/accent'] = 'REF:' + themeName + closestStep;
      mappings['semantic/common/accent-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/common/accent-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/common/muted'] = 'GRAY:300';
      
      mappings['semantic/fill/tertiary'] = 'GRAY:100';
      mappings['semantic/fill/tertiary-hover'] = 'GRAY:200';
      mappings['semantic/fill/tertiary-pressed'] = 'GRAY:200';
      mappings['semantic/fill/disabled'] = 'GRAY:150';
    }
  
  // =====================================
  // 옵션 4: foreground 중심 black bg
  // =====================================
  } else if (applicationMode === 'accent-on-bg-black') {
    console.log('[Backend] 옵션 4 (accent-on-bg-black) 실행 - colorRange:', colorRange);
    // 배경은 항상 black으로 고정
    mappings['semantic/background/default'] = 'GRAY:950';
    
    if (colorRange === 'light') {
      // 밝은 범위 - 어두운 배경에 맞는 텍스트 색상
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/selected'] = 'REF:' + themeName + closestStep;

      mappings['semantic/text/secondary'] = 'GRAY:300';
      mappings['semantic/text/tertiary'] = 'GRAY:400';
      mappings['semantic/text/disabled'] = 'GRAY:600';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/fill/surface-contents'] = 'STATIC-WHITE-ALPHA:200';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'STATIC-WHITE-ALPHA:200';
      mappings['semantic/border/line'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'STATIC-WHITE-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'GRAY:950';
      mappings['semantic/fill/silent-hover'] = 'GRAY:900';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:900';
      
      mappings['semantic/common/accent'] = 'REF:' + themeName + '400';
      mappings['semantic/common/accent-pressed'] = 'REF:' + themeName + '300';
      mappings['semantic/common/accent-hover'] = 'REF:' + themeName + '300';
      mappings['semantic/common/muted'] = 'STATIC-WHITE-ALPHA:400';

      mappings['semantic/fill/tertiary'] = 'STATIC-WHITE-ALPHA:400';
      mappings['semantic/fill/tertiary-hover'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/tertiary-pressed'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/disabled'] = 'STATIC-WHITE-ALPHA:200';
      
    } else if (colorRange === 'medium') {
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/selected'] = 'REF:' + themeName + adjustStep(closestStep, -1);

      mappings['semantic/text/secondary'] = 'GRAY:300';
      mappings['semantic/text/tertiary'] = 'GRAY:400';
      mappings['semantic/text/disabled'] = 'GRAY:600';
      mappings['semantic/text/on-color'] = 'GRAY:900';
      
      mappings['semantic/fill/surface-contents'] = 'STATIC-WHITE-ALPHA:200';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + closestStep;
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/border/divider'] = 'STATIC-WHITE-ALPHA:200';
      mappings['semantic/border/line'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'STATIC-WHITE-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'GRAY:950';
      mappings['semantic/fill/silent-hover'] = 'GRAY:900';
      mappings['semantic/fill/silent-pressed'] = 'GRAY:900';
      
      mappings['semantic/common/accent'] = 'REF:' + themeName + '400';
      mappings['semantic/common/accent-pressed'] = 'REF:' + themeName + '300';
      mappings['semantic/common/accent-hover'] = 'REF:' + themeName + '300';
      mappings['semantic/common/muted'] = 'STATIC-WHITE-ALPHA:400';

      mappings['semantic/fill/tertiary'] = 'STATIC-WHITE-ALPHA:400';
      mappings['semantic/fill/tertiary-hover'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/tertiary-pressed'] = 'STATIC-WHITE-ALPHA:300';
      mappings['semantic/fill/disabled'] = 'STATIC-WHITE-ALPHA:200';
      
    } else {
      // 어두운 범위 (Step 700-950) - 어두운 배경이지만 밝은 텍스트 사용 (흰 배경 대비)
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/selected'] = 'STATIC-WHITE-ALPHA:900';

      mappings['semantic/text/secondary'] = 'GRAY:300';
      mappings['semantic/text/tertiary'] = 'GRAY:400';
      mappings['semantic/text/disabled'] = 'GRAY:600';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
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
      
      mappings['semantic/common/accent'] = 'REF:' + themeName + '400';
      mappings['semantic/common/accent-pressed'] = 'REF:' + themeName + '300';
      mappings['semantic/common/accent-hover'] = 'REF:' + themeName + '300';
      mappings['semantic/common/muted'] = 'STATIC-WHITE-ALPHA:400';

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
    
    // 기본적으로 옵션 1 (accent-on-bg-off)의 매핑을 사용하되, 배경만 사용자 지정
    if (colorRange === 'light') {
      mappings['semantic/text/primary'] = 'GRAY:50';
      mappings['semantic/text/selected'] = 'REF:' + themeName + closestStep;
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
      
      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '950';
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + '900';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '900';
      
      mappings['semantic/common/accent'] = 'REF:' + themeName + adjustStep(closestStep, -2);
      mappings['semantic/common/accent-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/common/accent-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/common/muted'] = 'GRAY:700';
      
      mappings['semantic/fill/tertiary'] = 'GRAY-ALPHA:300';
      mappings['semantic/fill/tertiary-hover'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/tertiary-pressed'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/disabled'] = 'GRAY-ALPHA:200';
      
    } else {
      // 어두운 범위도 동일하게 옵션 1 로직 사용
      mappings['semantic/text/primary'] = 'GRAY:900';
      mappings['semantic/text/selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/text/secondary'] = 'GRAY-ALPHA:700';
      mappings['semantic/text/tertiary'] = 'GRAY-ALPHA:600';
      mappings['semantic/text/disabled'] = 'GRAY-ALPHA:400';
      mappings['semantic/text/on-color'] = 'GRAY:50';
      
      mappings['semantic/background/default'] = 'CUSTOM_BACKGROUND';
      mappings['semantic/fill/surface-contents'] = 'GRAY-ALPHA:100';

      mappings['semantic/fill/primary'] = 'REF:' + themeName + closestStep;
      mappings['semantic/fill/primary-hover'] = 'REF:' + themeName + adjustStep(closestStep, -1);
      mappings['semantic/fill/primary-pressed'] = 'REF:' + themeName + adjustStep(closestStep, -1);

      mappings['semantic/border/divider-strong'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/line-selected'] = 'REF:' + themeName + closestStep;
      mappings['semantic/border/divider'] = 'GRAY-ALPHA:200';
      mappings['semantic/border/line'] = 'GRAY-ALPHA:300';
      mappings['semantic/border/line-disabled'] = 'GRAY-ALPHA:200';
      
      mappings['semantic/fill/silent'] = 'REF:' + themeName + '100';
      mappings['semantic/fill/silent-hover'] = 'REF:' + themeName + '150';
      mappings['semantic/fill/silent-pressed'] = 'REF:' + themeName + '150';
      
      mappings['semantic/common/accent'] = 'REF:' + themeName + adjustStep(closestStep, 2);
      mappings['semantic/common/accent-pressed'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/common/accent-hover'] = 'REF:' + themeName + adjustStep(closestStep, 1);
      mappings['semantic/common/muted'] = 'GRAY:300';
      
      mappings['semantic/fill/tertiary'] = 'GRAY-ALPHA:300';
      mappings['semantic/fill/tertiary-hover'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/tertiary-pressed'] = 'GRAY-ALPHA:200';
      mappings['semantic/fill/disabled'] = 'GRAY-ALPHA:200';
    }
  }
  
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
    var step;
    
    if (refString.startsWith(theme.themeName)) {
      var stepString = refString.substring(theme.themeName.length);
      step = parseInt(stepString);
    } else {
      step = parseInt(refString);
    }
    
    var colorObj = scaleColors.find(function(c) { return c.step == step; });
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
  
  var mappings = getDynamicMappings(closestStep, theme.themeName, applicationMode, theme.baseColor);
  console.log('[Backend] 생성된 매핑:', mappings);
  
  // 모든 변수 가져오기
  var allVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  var appliedCount = 0;
  
  
  // 매핑 값에서 실제 토큰을 찾는 함수
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
        var foundVar = allVariables.find(function(v) {
          return v.name === scaleVarName && v.variableCollectionId === collection.id;
        });
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
      // Custom Background는 변수 대신 직접 색상값을 사용
      console.log('[Backend] Custom Background 토큰 감지');
      return 'CUSTOM_BACKGROUND';
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
    } else if (mappingValue === 'CUSTOM_BACKGROUND') {
      // Custom Background의 경우 실제 색상은 별도 처리되므로 임시 색상 반환
      return { r: 0.96, g: 0.96, b: 0.96 }; // #F5F5F5
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
              var newToken = findTokenFromMapping(mappedValue);
              
              // Custom Background 처리
              if (newToken === 'CUSTOM_BACKGROUND' && theme.customBackgroundColor) {
                console.log('[Backend] Custom Background 색상 적용:', theme.customBackgroundColor, '토큰:', currentVar.name);
                var customColor = hexToFigmaRGB(theme.customBackgroundColor);
                
                // Custom 색상으로 직접 설정 (변수 바인딩 없이)
                var newFills = node.fills.slice();
                newFills[f] = {
                  type: 'SOLID',
                  color: customColor
                };
                node.fills = newFills;
                appliedCount++;
                
              } else if (newToken) {
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
  var mappings = getDynamicMappings(closestStep, theme.themeName, applicationMode, theme.baseColor);
  
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
}, 100);

