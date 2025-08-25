// Figma Plugin Backend Code
figma.showUI(__html__, { width: 360, height: 700 });

// Semantic Token Mapping Configuration
const SEMANTIC_TOKEN_MAPPING = {
  // Background tokens
  'bg-default': { scale: 50, type: 'background' },
  'bg-subtle': { scale: 100, type: 'background' },
  'bg-muted': { scale: 200, type: 'background' },
  'surface-default': { scale: 50, type: 'surface' },
  'surface-subtle': { scale: 100, type: 'surface' },
  'surface-muted': { scale: 150, type: 'surface' },
  
  // Text tokens
  'text-default': { scale: 900, type: 'text' },
  'text-bold': { scale: 950, type: 'text' },
  'text-subtle': { scale: 600, type: 'text' },
  'text-muted': { scale: 500, type: 'text' },
  'text-disabled': { scale: 400, type: 'text' },
  
  // Icon tokens
  'icon-default': { scale: 700, type: 'icon' },
  'icon-bold': { scale: 900, type: 'icon' },
  'icon-subtle': { scale: 500, type: 'icon' },
  'icon-disabled': { scale: 400, type: 'icon' },
  
  // Border tokens
  'border-default': { scale: 300, type: 'border' },
  'border-bold': { scale: 400, type: 'border' },
  'border-subtle': { scale: 200, type: 'border' },
  
  // Interactive states
  'hover': { scale: 600, type: 'interactive' },
  'active': { scale: 700, type: 'interactive' },
  'selected': { scale: 800, type: 'interactive' }
};

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
  // Token Theme 적용 - Frame의 레이어들에 색상 적용
  else if (msg.type === 'apply-token-theme-to-frame') {
    applyTokenThemeToFrame(msg);
  }
};

// Color Variables 생성 함수
async function createColorVariables(msg) {
  try {
    // 기존 컬렉션 확인 및 생성
    let collection = figma.variables.getLocalVariableCollections()
      .find(c => c.name === msg.collectionName || c.name === 'Color System');
    
    if (!collection) {
      collection = figma.variables.createVariableCollection(msg.collectionName || 'Color System');
    }
    
    if (msg.dualMode) {
      // Light & Dark 모드 생성
      const lightModeId = collection.modes[0].modeId;
      let darkModeId;
      
      if (collection.modes.length > 1) {
        darkModeId = collection.modes[1].modeId;
      } else {
        const newMode = collection.addMode('Dark');
        darkModeId = newMode;
      }
      
      // 모드 이름 설정
      try {
        collection.renameMode(lightModeId, 'Light');
      } catch (e) {
        console.log('Could not rename mode:', e);
      }
      
      // Light 색상
      for (const color of msg.lightColors) {
        const variableName = `${msg.variableName}/${color.step}`;
        let variable = findOrCreateVariable(variableName, collection, 'COLOR');
        
        const rgb = hexToRgb(color.hex);
        variable.setValueForMode(lightModeId, {
          r: rgb.r / 255,
          g: rgb.g / 255,
          b: rgb.b / 255,
          a: 1
        });
      }
      
      // Dark 색상
      for (const color of msg.darkColors) {
        const variableName = `${msg.variableName}/${color.step}`;
        let variable = findOrCreateVariable(variableName, collection, 'COLOR');
        
        const rgb = hexToRgb(color.hex);
        variable.setValueForMode(darkModeId, {
          r: rgb.r / 255,
          g: rgb.g / 255,
          b: rgb.b / 255,
          a: 1
        });
      }
    } else {
      // 단일 모드
      const modeId = collection.modes[0].modeId;
      
      for (const color of msg.colors) {
        const variableName = `${msg.variableName}/${color.step}`;
        let variable = findOrCreateVariable(variableName, collection, 'COLOR');
        
        const rgb = hexToRgb(color.hex);
        variable.setValueForMode(modeId, {
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

// Token Theme를 Frame의 레이어에 적용
async function applyTokenThemeToFrame(msg) {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.notify('⚠️ Please select a Frame first');
    return;
  }
  
  let appliedCount = 0;
  const scaleColors = msg.scaleColors;
  
  // 선택된 Frame들 처리
  for (const node of selection) {
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      appliedCount += await applyColorsToFrameLayers(node, scaleColors);
    }
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

// Frame 내부 레이어들에 색상 적용
async function applyColorsToFrameLayers(frame, scaleColors) {
  let count = 0;
  
  // 재귀적으로 모든 자식 노드 처리
  async function processNode(node) {
    // Fill에 바인딩된 Variable 확인
    if ('fills' in node && node.fills.length > 0) {
      // boundVariables 체크
      if (node.boundVariables && node.boundVariables.fills) {
        const fillBinding = node.boundVariables.fills;
        
        // boundVariables.fills는 배열이거나 단일 객체일 수 있음
        const bindings = Array.isArray(fillBinding) ? fillBinding : [fillBinding];
        
        for (let i = 0; i < bindings.length; i++) {
          const binding = bindings[i];
          
          if (binding?.id) {
            try {
              const variable = await figma.variables.getVariableByIdAsync(binding.id);
              
              if (variable && variable.name) {
                const variableName = variable.name.toLowerCase();
                console.log(`Processing: "${variable.name}" on "${node.name}"`);
                
                // Semantic token 매칭 (간단화된 로직)
                const matchedToken = findSemanticToken(variableName);
                
                if (matchedToken) {
                  const scaleColor = scaleColors.find(c => c.step === matchedToken.scale);
                  
                  if (scaleColor) {
                    const rgb = hexToRgb(scaleColor.hex);
                    
                    // 현재 fills 복사 후 수정
                    const newFills = [...node.fills];
                    if (newFills[i] && newFills[i].type === 'SOLID') {
                      newFills[i] = {
                        type: 'SOLID',
                        color: {
                          r: rgb.r / 255,
                          g: rgb.g / 255,
                          b: rgb.b / 255
                        }
                      };
                      node.fills = newFills;
                      count++;
                      console.log(`✅ Applied ${matchedToken.name} to "${node.name}"`);
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`Error processing fill variable:`, error);
            }
          }
        }
      }
    }
    
    // Stroke에 바인딩된 Variable 확인
    if ('strokes' in node && node.strokes.length > 0) {
      if (node.boundVariables?.strokes) {
        const strokeBinding = node.boundVariables.strokes;
        const bindings = Array.isArray(strokeBinding) ? strokeBinding : [strokeBinding];
        
        for (let i = 0; i < bindings.length; i++) {
          const binding = bindings[i];
          
          if (binding?.id) {
            try {
              const variable = await figma.variables.getVariableByIdAsync(binding.id);
              
              if (variable && variable.name) {
                const variableName = variable.name.toLowerCase();
                const matchedToken = findSemanticToken(variableName);
                
                if (matchedToken && matchedToken.type === 'border') {
                  const scaleColor = scaleColors.find(c => c.step === matchedToken.scale);
                  
                  if (scaleColor) {
                    const rgb = hexToRgb(scaleColor.hex);
                    
                    const newStrokes = [...node.strokes];
                    if (newStrokes[i] && newStrokes[i].type === 'SOLID') {
                      newStrokes[i] = {
                        type: 'SOLID',
                        color: {
                          r: rgb.r / 255,
                          g: rgb.g / 255,
                          b: rgb.b / 255
                        }
                      };
                      node.strokes = newStrokes;
                      count++;
                      console.log(`✅ Applied border ${matchedToken.name} to "${node.name}"`);
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`Error processing stroke variable:`, error);
            }
          }
        }
      }
    }
    
    // 자식 노드들도 처리
    if ('children' in node) {
      for (const child of node.children) {
        await processNode(child);
      }
    }
  }
  
  await processNode(frame);
  return count;
}

// 간단화된 Semantic Token 매칭 함수
function findSemanticToken(variableName) {
  // 일반적인 semantic token 패턴 체크
  const semanticKeywords = [
    'semantic', 'neutral', 'gray', 'grey',
    'background', 'bg', 'surface',
    'text', 'foreground', 'fg',
    'icon', 'border', 'divider', 'stroke'
  ];
  
  // neutral/gray 계열이 아니면 null 반환
  const hasSemanticKeyword = semanticKeywords.some(keyword => 
    variableName.includes(keyword)
  );
  
  if (!hasSemanticKeyword) {
    return null;
  }
  
  // 각 토큰과 매칭 시도
  for (const [tokenName, tokenConfig] of Object.entries(SEMANTIC_TOKEN_MAPPING)) {
    // 토큰 이름의 주요 부분들 추출
    const tokenParts = tokenName.split('-');
    
    // Variable 이름에 토큰의 주요 부분들이 포함되어 있는지 체크
    const isMatch = tokenParts.every(part => {
      // 유사한 단어들도 매칭
      const synonyms = getSynonyms(part);
      return synonyms.some(syn => variableName.includes(syn));
    });
    
    if (isMatch) {
      return {
        name: tokenName,
        scale: tokenConfig.scale,
        type: tokenConfig.type
      };
    }
  }
  
  return null;
}

// 동의어 매핑
function getSynonyms(word) {
  const synonymMap = {
    'bg': ['bg', 'background', 'surface'],
    'surface': ['surface', 'bg', 'background'],
    'text': ['text', 'foreground', 'fg', 'label'],
    'icon': ['icon', 'iconography', 'glyph'],
    'border': ['border', 'divider', 'stroke', 'outline'],
    'default': ['default', 'primary', 'main', 'base'],
    'subtle': ['subtle', 'secondary', 'light'],
    'muted': ['muted', 'tertiary', 'disabled'],
    'bold': ['bold', 'strong', 'emphasis'],
    'disabled': ['disabled', 'inactive', 'muted']
  };
  
  return synonymMap[word] || [word];
}

// Variable 찾기 또는 생성
function findOrCreateVariable(name, collection, type) {
  // 기존 Variable 확인
  const existingVars = figma.variables.getLocalVariables(type);
  const existing = existingVars.find(v => 
    v.name === name && v.variableCollectionId === collection.id
  );
  
  if (existing) {
    return existing;
  }
  
  // 새로 생성
  return figma.variables.createVariable(name, collection, type);
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