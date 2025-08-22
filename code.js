// Figma Plugin Backend Code
figma.showUI(__html__, { width: 360, height: 600 });

// UI에 준비 완료 메시지 전송
figma.ui.postMessage({ 
  type: 'plugin-ready', 
  message: 'Plugin initialized' 
});

// UI로부터 메시지 수신
figma.ui.onmessage = msg => {
  
  // Variable 생성
  if (msg.type === 'create-variables') {
    createColorVariables(msg);
  }
  
  // 레이어에 색상 적용
  else if (msg.type === 'apply-colors-to-layers') {
    applyColorsToLayers(msg);
  }
  
  // Token Theme 적용
  else if (msg.type === 'apply-token-theme') {
    applyTokenTheme(msg);
  }
};

// Color Variables 생성 함수
async function createColorVariables(msg) {
  try {
    const collection = figma.variables.createVariableCollection('Color System');
    
    if (msg.dualMode) {
      // Light & Dark 모드 생성
      const lightMode = collection.addMode('Light');
      const darkMode = collection.addMode('Dark');
      
      // Light 색상
      for (const color of msg.lightColors) {
        const variable = figma.variables.createVariable(
          `${msg.variableName}-${color.step}`,
          collection.id,
          'COLOR'
        );
        
        const rgb = hexToRgb(color.hex);
        variable.setValueForMode(lightMode, {
          r: rgb.r / 255,
          g: rgb.g / 255,
          b: rgb.b / 255,
          a: 1
        });
      }
      
      // Dark 색상
      for (const color of msg.darkColors) {
        const variable = figma.variables.getVariableByName(
          `${msg.variableName}-${color.step}`
        );
        
        if (variable) {
          const rgb = hexToRgb(color.hex);
          variable.setValueForMode(darkMode, {
            r: rgb.r / 255,
            g: rgb.g / 255,
            b: rgb.b / 255,
            a: 1
          });
        }
      }
    } else {
      // 단일 모드
      const mode = collection.modes[0].modeId;
      
      for (const color of msg.colors) {
        const variable = figma.variables.createVariable(
          `${msg.variableName}-${color.step}`,
          collection.id,
          'COLOR'
        );
        
        const rgb = hexToRgb(color.hex);
        variable.setValueForMode(mode, {
          r: rgb.r / 255,
          g: rgb.g / 255,
          b: rgb.b / 255,
          a: 1
        });
      }
    }
    
    figma.ui.postMessage({ 
      type: 'variable-created',
      success: true 
    });
    
    figma.notify('✅ Variables created successfully!');
    
  } catch (error) {
    console.error('Variable creation error:', error);
    figma.notify('❌ Error creating variables', { error: true });
  }
}

// 레이어에 색상 적용 함수
async function applyColorsToLayers(msg) {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.notify('⚠️ Please select layers first');
    return;
  }
  
  let appliedCount = 0;
  
  for (const node of selection) {
    const nodeName = node.name.toLowerCase();
    
    // 매핑 규칙에 따라 색상 찾기
    for (const [keyword, colorData] of Object.entries(msg.layerMappings)) {
      if (nodeName.includes(keyword)) {
        if ('fills' in node) {
          const rgb = hexToRgb(colorData.hex);
          node.fills = [{
            type: 'SOLID',
            color: {
              r: rgb.r / 255,
              g: rgb.g / 255,
              b: rgb.b / 255
            }
          }];
          appliedCount++;
          break;
        }
      }
    }
  }
  
  figma.notify(`✅ Applied colors to ${appliedCount} layers`);
}

// Token Theme를 레이어에 적용하는 함수
async function applyTokenTheme(msg) {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.notify('⚠️ Please select layers to apply theme');
    return;
  }
  
  let appliedCount = 0;
  const theme = msg.theme;
  
  // 선택된 모든 노드를 재귀적으로 순회
  function applyToNode(node) {
    // 노드에 바인딩된 Variable 확인
    if ('boundVariables' in node && node.boundVariables) {
      // fills에 바인딩된 Variable 확인
      if (node.boundVariables['fills'] && node.boundVariables['fills'].length > 0) {
        const fillVariable = node.boundVariables['fills'][0];
        
        // Variable ID로 Variable 객체 가져오기
        const variable = figma.variables.getVariableById(fillVariable.id);
        
        if (variable) {
          const variableName = variable.name.toLowerCase();
          
          // semantic token 패턴 확인
          for (const [tokenName, colorHex] of Object.entries(theme.tokens)) {
            if (variableName.includes(tokenName) || 
                variableName.includes(tokenName.replace(/-/g, '/')) ||
                variableName.includes(tokenName.replace(/-/g, '.')) ||
                variableName.includes(tokenName.replace(/-/g, '_'))) {
              
              // 색상 적용
              if ('fills' in node) {
                const rgb = hexToRgb(colorHex);
                node.fills = [{
                  type: 'SOLID',
                  color: {
                    r: rgb.r / 255,
                    g: rgb.g / 255,
                    b: rgb.b / 255
                  }
                }];
                appliedCount++;
                console.log(`Applied ${tokenName} to node with variable ${variableName}`);
                break;
              }
            }
          }
          
          // background 특별 처리
          if (variableName.includes('background') || variableName.includes('bg')) {
            if ('fills' in node) {
              const rgb = hexToRgb(theme.background);
              node.fills = [{
                type: 'SOLID',
                color: {
                  r: rgb.r / 255,
                  g: rgb.g / 255,
                  b: rgb.b / 255
                }
              }];
              appliedCount++;
            }
          }
        }
      }
      
      // strokes에 바인딩된 Variable 확인 (border tokens)
      if (node.boundVariables['strokes'] && node.boundVariables['strokes'].length > 0) {
        const strokeVariable = node.boundVariables['strokes'][0];
        const variable = figma.variables.getVariableById(strokeVariable.id);
        
        if (variable) {
          const variableName = variable.name.toLowerCase();
          
          for (const [tokenName, colorHex] of Object.entries(theme.tokens)) {
            if (tokenName.includes('border') && 
                (variableName.includes(tokenName) || 
                 variableName.includes('border'))) {
              
              if ('strokes' in node) {
                const rgb = hexToRgb(colorHex);
                node.strokes = [{
                  type: 'SOLID',
                  color: {
                    r: rgb.r / 255,
                    g: rgb.g / 255,
                    b: rgb.b / 255
                  }
                }];
                appliedCount++;
                break;
              }
            }
          }
        }
      }
    }
    
    // 자식 노드들도 처리
    if ('children' in node) {
      for (const child of node.children) {
        applyToNode(child);
      }
    }
  }
  
  // 선택된 모든 노드에 적용
  for (const node of selection) {
    applyToNode(node);
  }
  
  figma.ui.postMessage({ 
    type: 'token-theme-applied',
    success: true,
    count: appliedCount
  });
  
  if (appliedCount > 0) {
    figma.notify(`✅ Applied theme to ${appliedCount} layers with semantic tokens`);
  } else {
    figma.notify('⚠️ No layers with semantic token variables found');
  }
}

// 유틸리티 함수: HEX를 RGB로 변환
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// 플러그인 종료 처리
figma.on('close', () => {
  // 정리 작업이 필요한 경우 여기에 추가
});