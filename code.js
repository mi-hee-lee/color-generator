// Color Generator - Figma Plugin Main Code
console.log('🎨 Color Generator Plugin Started');

// 플러그인 UI 창 열기
figma.showUI(__html__, { 
  width: 400, 
  height: Math.round(figma.viewport.bounds.height * 0.7),
  themeColors: true
});

// 설정 상수
const CONFIG = {
  GRAYSCALE_THRESHOLD: 5,
  EXTREME_COLOR_BLEND_RATIO: 0.8,
  MIN_SATURATION_BOOST: 20
};

// UI 메시지 핸들러
figma.ui.onmessage = function(message) {
  console.log('Received message:', message.type);
  
  try {
    switch(message.type) {
      case 'create-variables':
        if (message.dualMode) {
          createDualModeVariables(message.lightColors, message.darkColors, message.variableName, message.baseColor);
        } else {
          createColorVariables(message.colors, message.variableName, message.mode, message.baseColor);
        }
        break;
      case 'create-styles':
        createColorStyles(message.colors, message.mode, message.baseColor, message.customName);
        break;
      case 'copy-color':
        copyColorToClipboard(message.color);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  } catch (error) {
    console.error('Message processing error:', error);
    figma.notify('Error: ' + error.message, { error: true });
  }
};

// Variable 생성 함수
function createColorVariables(colors, variableName, mode, baseColor) {
  console.log('Creating color variables:', colors.length);
  
  try {
    if (!figma.variables) {
      figma.notify('⚠️ This Figma version does not support Variables', { error: true });
      return;
    }
    
    const now = new Date();
    const timeString = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const collectionName = `${variableName} Colors (${timeString})`;
    
    const collection = figma.variables.createVariableCollection(collectionName);
    const modeId = collection.modes[0].modeId;
    collection.renameMode(modeId, mode === 'dark' ? 'Dark' : 'Light');
    
    let createdCount = 0;
    
    for (const color of colors) {
      try {
        const variable = figma.variables.createVariable(
          `${variableName}-${color.step}`,
          collection,
          'COLOR'
        );
        
        const rgb = hexToRgb(color.hex);
        variable.setValueForMode(modeId, {
          r: rgb.r / 255,
          g: rgb.g / 255,
          b: rgb.b / 255
        });
        
        let description = `${color.hex.toUpperCase()} | ${color.contrast.toFixed(2)}:1 contrast`;
        if (color.contrast >= 7) description += ' | AAA';
        else if (color.contrast >= 4.5) description += ' | AA';
        else if (color.contrast >= 3) description += ' | A';
        if (color.isClosest) description += ' | INPUT';
        
        variable.description = description;
        createdCount++;
      } catch (error) {
        console.error(`Failed to create variable for step ${color.step}:`, error);
      }
    }
    
    figma.notify(`✅ ${createdCount} variables created successfully!`, { timeout: 4000 });
  } catch (error) {
    console.error('Variable creation error:', error);
    figma.notify('❌ Failed to create variables: ' + error.message, { error: true });
  }
}

// Dual Mode Variable 생성
function createDualModeVariables(lightColors, darkColors, variableName, baseColor) {
  console.log('Creating dual mode variables');
  
  try {
    if (!figma.variables) {
      figma.notify('⚠️ This Figma version does not support Variables', { error: true });
      return;
    }
    
    const now = new Date();
    const timeString = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const collectionName = `${variableName} Colors (${timeString})`;
    
    const collection = figma.variables.createVariableCollection(collectionName);
    const lightModeId = collection.modes[0].modeId;
    collection.renameMode(lightModeId, 'Light');
    const darkModeId = collection.addMode('Dark');
    
    let createdCount = 0;
    
    for (let i = 0; i < lightColors.length; i++) {
      const lightColor = lightColors[i];
      const darkColor = darkColors[i];
      
      try {
        const variable = figma.variables.createVariable(
          `${variableName}-${lightColor.step}`,
          collection,
          'COLOR'
        );
        
        const lightRgb = hexToRgb(lightColor.hex);
        variable.setValueForMode(lightModeId, {
          r: lightRgb.r / 255,
          g: lightRgb.g / 255,
          b: lightRgb.b / 255
        });
        
        const darkRgb = hexToRgb(darkColor.hex);
        variable.setValueForMode(darkModeId, {
          r: darkRgb.r / 255,
          g: darkRgb.g / 255,
          b: darkRgb.b / 255
        });
        
        variable.description = `Light: ${lightColor.hex.toUpperCase()} | Dark: ${darkColor.hex.toUpperCase()}`;
        createdCount++;
      } catch (error) {
        console.error(`Failed to create dual variable for step ${lightColor.step}:`, error);
      }
    }
    
    figma.notify(`🌓 ${createdCount} dual-mode variables created!`, { timeout: 4000 });
  } catch (error) {
    console.error('Dual variable creation error:', error);
    figma.notify('❌ Failed to create dual variables: ' + error.message, { error: true });
  }
}

// Style 생성 함수
function createColorStyles(colors, mode, baseColor, customName) {
  console.log('Creating color styles:', colors.length);
  
  try {
    const now = new Date();
    const timeString = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const groupName = `${customName || 'Color'} ${mode === 'dark' ? '🌙' : '☀️'} (${timeString})`;
    
    let createdCount = 0;
    
    for (const color of colors) {
      try {
        const style = figma.createPaintStyle();
        style.name = `${groupName}/${color.step}`;
        
        const rgb = hexToRgb(color.hex);
        style.paints = [{
          type: 'SOLID',
          color: {
            r: rgb.r / 255,
            g: rgb.g / 255,
            b: rgb.b / 255
          }
        }];
        
        let description = `${color.hex.toUpperCase()} | ${color.contrast.toFixed(2)}:1`;
        if (color.contrast >= 7) description += ' | AAA';
        else if (color.contrast >= 4.5) description += ' | AA';
        else if (color.contrast >= 3) description += ' | A';
        if (color.isClosest) description += ' | INPUT';
        
        style.description = description;
        createdCount++;
      } catch (error) {
        console.error('Style creation failed:', error);
      }
    }
    
    figma.notify(`🎨 ${createdCount} styles created successfully!`, { timeout: 4000 });
  } catch (error) {
    console.error('Style creation error:', error);
    figma.notify('❌ Failed to create styles: ' + error.message, { error: true });
  }
}

// 색상 복사
function copyColorToClipboard(color) {
  figma.notify(`📋 ${color} copied!`, { timeout: 2000 });
}

// 유틸리티 함수
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

// 선택 변경 감지
figma.on('selectionchange', function() {
  const selectionCount = figma.currentPage.selection.length;
  let selectionInfo = 'No objects selected';
  
  if (selectionCount > 0) {
    const types = {};
    figma.currentPage.selection.forEach(node => {
      types[node.type] = (types[node.type] || 0) + 1;
    });
    
    const typesList = Object.keys(types).map(type => {
      const count = types[type];
      return `${count} ${type.toLowerCase()}${count > 1 ? 's' : ''}`;
    }).join(', ');
    
    selectionInfo = `${selectionCount} object${selectionCount > 1 ? 's' : ''} selected (${typesList})`;
  }
  
  figma.ui.postMessage({
    type: 'selection-changed',
    count: selectionCount,
    message: selectionInfo
  });
});

// 플러그인 종료 시 정리
figma.on('close', function() {
  console.log('Color Generator Plugin closed');
});

// 초기화 완료
console.log('🎨 Color Generator Plugin ready!');
figma.ui.postMessage({ 
  type: 'plugin-ready',
  message: 'Plugin initialization complete!'
});