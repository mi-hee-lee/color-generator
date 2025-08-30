// Figma Plugin Backend Code - Version 10 (Clean)
console.log('Backend script loading...');

// UI 표시
figma.showUI(__html__, { 
  width: 360, 
  height: 700,
  themeColors: true 
});

// =====================================
// WCAG 대비비율 계산 함수들
// =====================================

// 알파 합성 - 전경색(알파 포함)을 배경색과 합성
function composeAlpha(fgHex8, underlayHex) {
  var fg = hexToFigmaRGB(fgHex8);
  var bg = hexToFigmaRGB(underlayHex || '#FFFFFF');
  
  // 알파가 없거나 1인 경우 그대로 반환
  if (fg.a === undefined || fg.a === 1) {
    return fgHex8.substring(0, 7);
  }
  
  // 알파 블렌딩 공식: result = fg * alpha + bg * (1 - alpha)
  var r = Math.round((fg.r * fg.a + bg.r * (1 - fg.a)) * 255);
  var g = Math.round((fg.g * fg.a + bg.g * (1 - fg.a)) * 255);
  var b = Math.round((fg.b * fg.a + bg.b * (1 - fg.a)) * 255);
  
  return '#' + [r, g, b].map(function(x) {
    var hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

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

// 텍스트 색상 자동 결정
function decideTextColor(bgHex, options) {
  options = options || {};
  var largeText = options.largeText || false;
  var underlayHex = options.underlayHex || '#FFFFFF';
  
  // 1. 최종 배경색 계산 (알파 합성)
  var finalBg = bgHex;
  if (bgHex.length > 7) {
    finalBg = composeAlpha(bgHex, underlayHex);
  }
  
  // 2. 검정/흰색과의 대비 계산
  var blackContrast = contrastRatio(finalBg, '#000000');
  var whiteContrast = contrastRatio(finalBg, '#FFFFFF');
  
  // 3. 임계값 설정
  var threshold = largeText ? 3.0 : 4.5;
  
  // 4. 더 높은 대비를 주는 색상 선택
  var result;
  if (blackContrast >= whiteContrast) {
    result = {
      textToken: 'GRAY:900',
      chosen: '#000000',
      contrast: blackContrast,
      otherContrast: whiteContrast,
      lowContrast: blackContrast < threshold
    };
  } else {
    result = {
      textToken: 'GRAY:50',
      chosen: '#FFFFFF',
      contrast: whiteContrast,
      otherContrast: blackContrast,
      lowContrast: whiteContrast < threshold
    };
  }
  
  // 5. 디버깅 로그
  console.log('[CONTRAST] Background:', finalBg, 
              'Black:', blackContrast.toFixed(2), 
              'White:', whiteContrast.toFixed(2),
              'Chosen:', result.textToken,
              'Low:', result.lowContrast);
  
  return result;
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

// 가장 가까운 step 찾기
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
  
  return closestStep;
}

// =====================================
// 동적 매핑 함수
// =====================================

// 동적 매핑 생성
function getDynamicMappings(closestStep, themeName, inputHex, inverseMode) {
  var mappings = {};
  var inputHsl = hexToHsl(inputHex);
  var inputLightness = inputHsl[2];
  
  // fill/primary는 항상 closestStep 사용 (모든 경우에 동일)
  mappings['semantic/fill/primary'] = {
    light: 'REF:' + themeName + closestStep,
    dark: 'REF:' + themeName + closestStep
  };
  
  console.log('[fill/primary enforced] closestStep:', closestStep);
  
  // text/on-color 자동 결정 (WCAG 대비비율 기준)
  var textColorDecision = decideTextColor(inputHex, { largeText: false });
  mappings['semantic/text/on-color'] = {
    light: textColorDecision.textToken,
    dark: textColorDecision.textToken
  };
  
  if (textColorDecision.lowContrast) {
    console.warn('[CONTRAST WARNING] Low contrast detected for on-color text');
  }
  
  if (inputLightness >= 80) {
    // LIGHT CASE (L값 80 이상)
    console.log('Light color mapping (L >= 80), inverse mode:', inverseMode);
    
    if (inverseMode) {
      // Inverse mode ON - 밝은 색상일 때 어두운 텍스트 사용
      mappings['semantic/text/primary'] = {
        light: 'GRAY:900',
        dark: 'GRAY:900'
      };
      mappings['semantic/text/secondary'] = {
        light: 'GRAY:700',
        dark: 'GRAY:700'
      };
      mappings['semantic/text/tertiary'] = {
        light: 'GRAY:600',
        dark: 'GRAY:600'
      };
      mappings['semantic/text/disabled'] = {
        light: 'GRAY:400',
        dark: 'GRAY:400'
      };
    } else {
      // Normal mode - 기존 로직
      mappings['semantic/text/primary'] = {
        light: 'GRAY:50',
        dark: 'GRAY:50'
      };
      mappings['semantic/text/secondary'] = {
        light: 'GRAY:100',
        dark: 'GRAY:100'
      };
      mappings['semantic/text/tertiary'] = {
        light: 'GRAY:200',
        dark: 'GRAY:200'
      };
      mappings['semantic/text/disabled'] = {
        light: 'GRAY:600',
        dark: 'GRAY:600'
      };
    }
    
    // Background - 400 사용 (중간톤)
    mappings['semantic/background/default'] = {
      light: 'REF:' + themeName + '400',
      dark: 'REF:' + themeName + '400'
    };
    
    // Fill 토큰 (primary는 위에서 이미 설정)
    mappings['semantic/fill/tertiary'] = {
      light: 'ALPHA:' + themeName + '100',
      dark: 'ALPHA:' + themeName + '100'
    };
    mappings['semantic/fill/disabled'] = {
      light: 'ALPHA:' + themeName + '100',
      dark: 'ALPHA:' + themeName + '100'
    };
    mappings['semantic/fill/surface-contents'] = {
      light: 'ALPHA:' + themeName + '100',
      dark: 'ALPHA:' + themeName + '100'
    };
    
  } else {
    // DARK CASE (L값 80 미만) - 변경 없음
    console.log('Dark color mapping (L < 80)');
    
    // Text 토큰 - gray 변수 참조
    mappings['semantic/text/primary'] = {
      light: 'GRAY:900',
      dark: 'GRAY:900'
    };
    mappings['semantic/text/secondary'] = {
      light: 'GRAY:700',
      dark: 'GRAY:700'
    };
    mappings['semantic/text/tertiary'] = {
      light: 'GRAY:600',
      dark: 'GRAY:600'
    };
    mappings['semantic/text/disabled'] = {
      light: 'GRAY:400',
      dark: 'GRAY:400'
    };
    
    // Background - 50 사용 (매우 밝음)
    mappings['semantic/background/default'] = {
      light: 'REF:' + themeName + '50',
      dark: 'REF:' + themeName + '50'
    };
    
    // Fill 토큰 (primary는 위에서 이미 설정)
    mappings['semantic/fill/tertiary'] = {
      light: 'ALPHA:' + themeName + '100',
      dark: 'ALPHA:' + themeName + '100'
    };
    mappings['semantic/fill/disabled'] = {
      light: 'ALPHA:' + themeName + '100',
      dark: 'ALPHA:' + themeName + '100'
    };
    mappings['semantic/fill/surface-contents'] = {
      light: 'ALPHA:' + themeName + '100',
      dark: 'ALPHA:' + themeName + '100'
    };
  }
  
  // 로그로 매핑 결과 확인
  console.log('Dynamic mappings for background/default:', mappings['semantic/background/default']);
  console.log('Dynamic mappings for fill/primary:', mappings['semantic/fill/primary']);
  console.log('Dynamic mappings for text/on-color:', mappings['semantic/text/on-color']);
  
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
  var modeId = collection.modes[0].modeId;
  
  for (var i = 0; i < msg.colors.length; i++) {
    var color = msg.colors[i];
    if (!color || !color.hex) continue;
    
    var variableName = 'scale/' + msg.variableName + color.step;
    var variable = await findOrCreateVariable(variableName, collection, 'COLOR');
    variable.setValueForMode(modeId, hexToFigmaRGB(color.hex));
    createdCount++;
  }
  
  figma.ui.postMessage({ 
    type: 'variable-created',
    success: true,
    count: createdCount
  });
  
  figma.notify('Created ' + createdCount + ' variables');
}

// Custom Theme 생성 핸들러
async function handleCreateCustomTheme(msg) {
  var theme = msg.theme;
  var inverseMode = msg.inverse || false;
  
  console.log('Creating theme with inverse mode:', inverseMode);
  
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
  
  // 400 단계 색상을 base RGB로 사용
  var baseColorLight = theme.scaleColors.light.find(function(c) { return c.step === 400; });
  var baseColorDark = theme.scaleColors.dark.find(function(c) { return c.step === 400; });
  
  if (!baseColorLight || !baseColorDark) {
    console.error('400 단계 색상을 찾을 수 없습니다');
    return;
  }
  
  var baseRgbLight = hexToFigmaRGB(baseColorLight.hex);
  var baseRgbDark = hexToFigmaRGB(baseColorDark.hex);
  
  // 고정된 알파 매핑 테이블
  var alphaMapping = {
    0: 0.00, 50: 0.05, 75: 0.08, 100: 0.10, 150: 0.15,
    200: 0.20, 300: 0.30, 400: 0.40, 500: 0.50,
    600: 0.60, 700: 0.70, 800: 0.80, 900: 0.90, 950: 0.95
  };
  
  // 각 단계별 alpha 토큰 생성
  for (var i = 0; i < theme.scaleColors.light.length; i++) {
    var step = theme.scaleColors.light[i].step;
    var alphaValue = alphaMapping[step];
    
    if (alphaValue === undefined) continue;
    
    var alphaVariableName = 'scale/' + theme.themeName + '-alpha-' + step;
    console.log('[ALPHA] Creating:', alphaVariableName, 'alpha:', alphaValue);
    
    var alphaVariable = await findOrCreateVariable(alphaVariableName, collection, 'COLOR');
    
    // 모든 4개 모드에 값 설정
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
  
  // alpha-00 생성
  var transparentVariableName = 'scale/' + theme.themeName + '-alpha-00';
  console.log('[ALPHA] Creating:', transparentVariableName, 'alpha: 0');
  
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
  // STEP 5: 동적 매핑 계산
  // =====================================
  
  var inputHsl = hexToHsl(theme.baseColor);
  var closestStep = findClosestStep(theme.scaleColors.light, theme.baseColor);
  
  console.log('Input color analysis - Closest step:', closestStep, 'L value:', inputHsl[2]);
  
  var dynamicMappings = getDynamicMappings(closestStep, theme.themeName, theme.baseColor, inverseMode);
  
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
  
  for (var i = 0; i < theme.semanticTokens.length; i++) {
    var token = theme.semanticTokens[i];
    var variable = await findOrCreateVariable(token.name, collection, 'COLOR');
    
    // 동적 매핑 확인
    var mappedValue = dynamicMappings[token.name];
    
    // fill/primary는 무조건 closestStep 사용
    if (token.name === 'semantic/fill/primary') {
      mappedValue = {
        light: 'REF:' + theme.themeName + closestStep,
        dark: 'REF:' + theme.themeName + closestStep
      };
      console.log('[OVERRIDE] fill/primary enforced to closestStep:', closestStep);
    }
    
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
          variable.setValueForMode(customDarkModeId, {
            type: 'VARIABLE_ALIAS', 
            id: grayVar.id
          });
          console.log('[SEM]', token.name, 'CustomLight/Dark', 'GRAY', grayStep);
        } else {
          console.log('[SKIP]', token.name, 'missing-gray-variable', grayVariableName);
          skippedCount++;
        }
      }
      // REF: 프리픽스 처리 - scale 변수를 alias로 참조
      else if (mappedValue.light && mappedValue.light.startsWith('REF:')) {
        var refInfo = mappedValue.light.replace('REF:', '');
        var step = parseInt(refInfo.match(/\d+$/)[0]);
        var scaleVariableName = 'scale/' + theme.themeName + step;
        
        var scaleVar = allVariables.find(function(v) {
          return v.name === scaleVariableName && v.variableCollectionId === collection.id;
        });
        
        if (scaleVar) {
          // Alias 방식으로 변경 (직접 값 복사 대신 변수 참조)
          variable.setValueForMode(customLightModeId, {
            type: 'VARIABLE_ALIAS',
            id: scaleVar.id
          });
          variable.setValueForMode(customDarkModeId, {
            type: 'VARIABLE_ALIAS',
            id: scaleVar.id
          });
          console.log('[SEM]', token.name, 'CustomLight/Dark', 'REF-ALIAS', step);
        } else {
          console.log('[SKIP]', token.name, 'missing-scale-variable', scaleVariableName);
          skippedCount++;
        }
      } 
      // ALPHA: 프리픽스 처리
      else if (mappedValue.light && mappedValue.light.startsWith('ALPHA:')) {
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
    } else if (token.name === 'semantic/border/divider-strong' || 
               token.name === 'semantic/border/line-selected') {
      // 특별 처리 토큰 - closestStep scale 변수 참조
      var scaleVariableName = 'scale/' + theme.themeName + closestStep;
      var scaleVar = allVariables.find(function(v) {
        return v.name === scaleVariableName && v.variableCollectionId === collection.id;
      });
      
      if (scaleVar) {
        variable.setValueForMode(customLightModeId, {
          type: 'VARIABLE_ALIAS',
          id: scaleVar.id
        });
        variable.setValueForMode(customDarkModeId, {
          type: 'VARIABLE_ALIAS',
          id: scaleVar.id
        });
        console.log('[SEM]', token.name, 'CustomLight/Dark', 'SPECIAL-ALIAS', closestStep);
      } else {
        // Fallback: 직접 값 설정
        variable.setValueForMode(customLightModeId, hexToFigmaRGB(theme.baseColor));
        variable.setValueForMode(customDarkModeId, hexToFigmaRGB(theme.baseColor));
        console.log('[SEM]', token.name, 'CustomLight/Dark', 'SPECIAL-DIRECT', 'base-color');
      }
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