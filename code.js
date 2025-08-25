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
      
      // 모드 이름 설정 (renameMode는 특별한 권한이 필요할 수 있음)
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
    if ('fills' in node && node.boundVariables && node.boundVariables['fills']) {
      // boundVariables['fills']는 배열이 아닌 단일 객체일 수 있음
      const fillBinding = Array.isArray(node.boundVariables['fills']) 
        ? node.boundVariables['fills'][0] 
        : node.boundVariables['fills'];
        
      if (fillBinding && fillBinding.id) {
        try {
          // Variable ID로 Variable 객체 가져오기
          const variable = figma.variables.getVariableById(fillBinding.id);
          
          if (variable && variable.name) {
            const variableName = variable.name.toLowerCase();
            console.log(`Processing fill variable: "${variable.name}" on node: "${node.name}"`);
            
            // 매칭된 토큰을 찾기 위한 개선된 로직
            const matchedToken = findMatchingSemanticToken(variableName);
            
            if (matchedToken) {
              const scaleColor = scaleColors.find(c => c.step === matchedToken.scale);
              
              if (scaleColor) {
                const rgb = hexToRgb(scaleColor.hex);
                node.fills = [{
                  type: 'SOLID',
                  color: {
                    r: rgb.r / 255,
                    g: rgb.g / 255,
                    b: rgb.b / 255
                  }
                }];
                count++;
                console.log(`✅ Applied ${matchedToken.name} (scale:${matchedToken.scale}, color:${scaleColor.hex}) to "${node.name}"`);
              } else {
                console.log(`⚠️ No scale color found for ${matchedToken.name} (scale: ${matchedToken.scale})`);
              }
            } else {
              // neutral/gray 관련이지만 매핑되지 않은 경우
              if (variableName.includes('neutral') || variableName.includes('gray') || 
                  variableName.includes('surface') || variableName.includes('background') ||
                  variableName.includes('text') || variableName.includes('icon') || 
                  variableName.includes('border')) {
                console.log(`⚠️ No semantic token mapping found for variable: "${variable.name}"`);
              } else {
                // 다른 색상 (orange, blue 등)은 보존
                const colorPattern = /(orange|blue|red|green|purple|yellow|pink|teal|indigo|primary|secondary|accent|success|warning|error|info)/;
                if (colorPattern.test(variableName)) {
                  console.log(`🔵 Preserving non-neutral color variable: "${variable.name}"`);
                } else {
                  console.log(`❓ Unknown variable pattern: "${variable.name}"`);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error processing variable ${fillBinding.id}:`, error);
        }
      }
    }
    
    // Stroke에 바인딩된 Variable 확인 (border tokens)
    if ('strokes' in node && node.boundVariables && node.boundVariables['strokes']) {
      const strokeBinding = Array.isArray(node.boundVariables['strokes'])
        ? node.boundVariables['strokes'][0]
        : node.boundVariables['strokes'];
        
      if (strokeBinding && strokeBinding.id) {
        try {
          const variable = figma.variables.getVariableById(strokeBinding.id);
          
          if (variable && variable.name) {
            const variableName = variable.name.toLowerCase();
            console.log(`Processing stroke variable: "${variable.name}" on node: "${node.name}"`);
            
            // 매칭된 토큰을 찾기 위한 개선된 로직
            const matchedToken = findMatchingSemanticToken(variableName);
            
            if (matchedToken && matchedToken.type === 'border') {
              const scaleColor = scaleColors.find(c => c.step === matchedToken.scale);
              
              if (scaleColor) {
                const rgb = hexToRgb(scaleColor.hex);
                node.strokes = [{
                  type: 'SOLID',
                  color: {
                    r: rgb.r / 255,
                    g: rgb.g / 255,
                    b: rgb.b / 255
                  }
                }];
                count++;
                console.log(`✅ Applied border ${matchedToken.name} (scale:${matchedToken.scale}, color:${scaleColor.hex}) to "${node.name}"`);
              }
            } else if (variableName.includes('border') || variableName.includes('divider') || variableName.includes('outline')) {
              console.log(`⚠️ No semantic token mapping found for stroke variable: "${variable.name}"`);
            } else {
              console.log(`🔵 Preserving non-border stroke variable: "${variable.name}"`);
            }
          }
        } catch (error) {
          console.error(`Error processing stroke variable:`, error);
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

// Semantic Token 매칭 함수
function findMatchingSemanticToken(variableName) {
  // Variable 이름을 정규화 (소문자, 구분자 통일)
  const normalizedName = variableName.toLowerCase()
    .replace(/[\s_\.]/g, '/') // 공백, 언더스코어, 점을 슬래시로 통일
    .replace(/[-]/g, '') // 하이픈 제거
    .replace(/semantic/g, '') // semantic 키워드 제거
    .replace(/\/+/g, '/') // 연속된 슬래시 정리
    .replace(/^\/|\/$/g, ''); // 앞뒤 슬래시 제거
  
  console.log(`Normalized variable name: "${variableName}" → "${normalizedName}"`);
  
  // 각 semantic token에 대해 매칭 시도
  for (const [tokenName, tokenConfig] of Object.entries(SEMANTIC_TOKEN_MAPPING)) {
    const tokenKey = tokenName.toLowerCase().replace(/-/g, '');
    
    // 다양한 패턴으로 매칭 시도
    const patterns = [
      // 정확한 토큰 이름 매칭 
      tokenName, // 'bg-default'
      tokenKey, // 'bgdefault'
      
      // 토큰 타입별 매칭
      ...getTokenTypePatterns(tokenName, tokenConfig.type),
      
      // 일반적인 변형들
      tokenName.replace(/-/g, ''),  // 'bgdefault'
      tokenName.replace(/-/g, '/'), // 'bg/default'
      tokenName.replace(/-/g, '_'), // 'bg_default'
    ];
    
    // 패턴 매칭 확인
    for (const pattern of patterns) {
      if (isVariableMatch(normalizedName, pattern)) {
        console.log(`✅ Matched "${variableName}" to token "${tokenName}" via pattern "${pattern}"`);
        return {
          name: tokenName,
          scale: tokenConfig.scale,
          type: tokenConfig.type
        };
      }
    }
  }
  
  console.log(`❌ No matching semantic token found for: "${variableName}"`);
  return null;
}

// 토큰 타입별 추가 패턴 생성
function getTokenTypePatterns(tokenName, tokenType) {
  const patterns = [];
  
  // 타입별 공통 패턴들
  switch (tokenType) {
    case 'background':
      patterns.push('bg', 'background', 'surface');
      if (tokenName.includes('default')) patterns.push('bg/default', 'background/default');
      if (tokenName.includes('subtle')) patterns.push('bg/subtle', 'background/subtle');
      if (tokenName.includes('muted')) patterns.push('bg/muted', 'background/muted');
      break;
      
    case 'surface':
      patterns.push('surface', 'bg', 'background');
      if (tokenName.includes('default')) patterns.push('surface/default', 'surface/neutral/default');
      if (tokenName.includes('subtle')) patterns.push('surface/subtle', 'surface/neutral/subtle');
      if (tokenName.includes('muted')) patterns.push('surface/muted', 'surface/neutral/muted');
      break;
      
    case 'text':
      patterns.push('text', 'foreground', 'fg');
      if (tokenName.includes('default')) patterns.push('text/default', 'text/neutral/default');
      if (tokenName.includes('bold')) patterns.push('text/bold', 'text/neutral/bold');
      if (tokenName.includes('subtle')) patterns.push('text/subtle', 'text/neutral/subtle');
      if (tokenName.includes('muted')) patterns.push('text/muted', 'text/neutral/muted');
      if (tokenName.includes('disabled')) patterns.push('text/disabled', 'text/neutral/disabled');
      break;
      
    case 'icon':
      patterns.push('icon', 'iconography');
      if (tokenName.includes('default')) patterns.push('icon/default', 'icon/neutral/default');
      if (tokenName.includes('bold')) patterns.push('icon/bold', 'icon/neutral/bold');
      if (tokenName.includes('subtle')) patterns.push('icon/subtle', 'icon/neutral/subtle');
      if (tokenName.includes('disabled')) patterns.push('icon/disabled', 'icon/neutral/disabled');
      break;
      
    case 'border':
      patterns.push('border', 'divider', 'outline', 'stroke');
      if (tokenName.includes('default')) patterns.push('border/default', 'border/neutral/default');
      if (tokenName.includes('bold')) patterns.push('border/bold', 'border/neutral/bold');
      if (tokenName.includes('subtle')) patterns.push('border/subtle', 'border/neutral/subtle');
      break;
  }
  
  return patterns;
}

// Variable 이름이 패턴과 매칭되는지 확인
function isVariableMatch(normalizedVariableName, pattern) {
  const normalizedPattern = pattern.toLowerCase()
    .replace(/[\s_\-\.]/g, '/') // 구분자 통일
    .replace(/\/+/g, '/') // 연속된 슬래시 정리
    .replace(/^\/|\/$/g, ''); // 앞뒤 슬래시 제거
  
  // 정확한 매칭
  if (normalizedVariableName === normalizedPattern) return true;
  
  // 포함 매칭 (neutral 포함)
  if (normalizedVariableName.includes(normalizedPattern) && 
      normalizedVariableName.includes('neutral')) return true;
      
  // 포함 매칭 (gray 포함)
  if (normalizedVariableName.includes(normalizedPattern) && 
      normalizedVariableName.includes('gray')) return true;
  
  // 부분 매칭 (순서 상관없이)
  const variableParts = normalizedVariableName.split('/').filter(p => p);
  const patternParts = normalizedPattern.split('/').filter(p => p);
  
  // 패턴의 모든 부분이 variable에 포함되어 있는지 확인
  return patternParts.every(part => 
    variableParts.some(vPart => vPart.includes(part) || part.includes(vPart))
  );
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