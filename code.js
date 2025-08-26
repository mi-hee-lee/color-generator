// Figma Plugin Backend Code
figma.showUI(__html__, { width: 360, height: 700 });

// Semantic Token Mapping Configuration - Based on ver2.json
const SEMANTIC_TOKEN_MAPPING = {
  // Background tokens
  'background/neutral-default': { scale: 50, type: 'background' },
  'background/neutral-black': { scale: 950, type: 'background' },
  
  // Surface tokens  
  'surface/neutral-default': { scale: 75, type: 'surface' },
  'surface/neutral-black': { scale: 950, type: 'surface' },
  'surface/neutral-floating': { scale: 900, type: 'surface' },
  'surface/neutral-dialog': { scale: 50, type: 'surface' },
  'surface/neutral-sheet': { scale: 50, type: 'surface' },
  
  // Container tokens
  'container/neutral-bold': { scale: 900, type: 'container' },
  'container/neutral-subtle': { scale: 75, type: 'container' },
  'container/neutral-muted': { scale: 50, type: 'container' },
  'container/disabled': { scale: 150, type: 'container' },
  
  // Text tokens
  'text/neutral-bold': { scale: 900, type: 'text' },
  'text/neutral-default': { scale: 700, type: 'text' },
  'text/neutral-subtle': { scale: 600, type: 'text' },
  'text/disabled': { scale: 400, type: 'text' },
  
  // Icon tokens
  'icon/neutral-bold': { scale: 900, type: 'icon' },
  'icon/neutral-default': { scale: 700, type: 'icon' },
  'icon/neutral-subtle': { scale: 600, type: 'icon' },
  'icon/neutral-muted': { scale: 300, type: 'icon' },
  'icon/disabled': { scale: 400, type: 'icon' },
  
  // Border tokens - 수정됨
  'border/neutral-bold': { scale: 600, type: 'border' }, // 950 -> 600
  'border/neutral-subtle': { scale: 200, type: 'border' }, // 200 유지
  'border/disabled': { scale: 200, type: 'border' },
  
  // Common tokens
  'common/neutral-inverse-bold': { scale: 50, type: 'common' },
  'common/neutral-on-dark-bold': { scale: 50, type: 'common' },
  'common/neutral-on-light-bold': { scale: 950, type: 'common' }
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
  const keyColor = msg.keyColor;
  const applyMode = msg.applyMode || 'all';
  const themeMode = msg.themeMode || 'light'; // dark/light 모드
  
  // 선택된 Frame들 처리
  for (const node of selection) {
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      appliedCount += await applyColorsToFrameLayers(node, scaleColors, keyColor, applyMode, themeMode);
    }
  }
  
  figma.ui.postMessage({ 
    type: 'token-theme-applied',
    success: true,
    count: appliedCount
  });
  
  const modeText = applyMode === 'boldOnly' ? ' (bold tokens only)' : '';
  const themeText = themeMode === 'dark' ? ' in dark mode' : ' in light mode';
  if (appliedCount > 0) {
    figma.notify(`✅ Applied theme to ${appliedCount} layers${modeText}${themeText}`);
  } else {
    figma.notify('⚠️ No layers with semantic token variables found');
  }
}

// Frame 내부 레이어들에 색상 적용
async function applyColorsToFrameLayers(frame, scaleColors, keyColor, applyMode) {
  let count = 0;
  
  // 재귀적으로 모든 자식 노드 처리
  async function processNode(node) {
    // 레이어 이름을 소문자로 변환하여 체크
    const lowerNodeName = node.name.toLowerCase();
    
    // 레이어 이름에 특정 키워드가 포함되면 건너뛰기
    if (node.name.includes('isSelected=false') || 
        node.name.includes('isDisabled=true') ||
        node.name.includes('Card') ||
        lowerNodeName.includes('title') ||
        lowerNodeName.includes('sectionheader')) {
      console.log(`⏭️ Skipping layer "${node.name}" due to exclusion rule`);
      return;
    }
    
    // Fill에 바인딩된 Variable 확인
    if ('fills' in node && node.fills.length > 0) {
      // boundVariables 체크
      if (node.boundVariables && node.boundVariables.fills) {
        const fillBinding = node.boundVariables.fills;
        
        // boundVariables.fills는 배열이거나 단일 객체일 수 있음
        const bindings = Array.isArray(fillBinding) ? fillBinding : [fillBinding];
        
        for (let i = 0; i < bindings.length; i++) {
          const binding = bindings[i];
          
          if (binding && binding.id) {
            try {
              const variable = await figma.variables.getVariableByIdAsync(binding.id);
              
              if (variable && variable.name) {
                const variableName = variable.name.toLowerCase();
                console.log(`Processing: "${variable.name}" on "${node.name}" (type: ${node.type})`);
                
                // TEXT 노드인 경우 Text Style 정보 출력
                if (node.type === 'TEXT') {
                  if ('textStyleId' in node && node.textStyleId) {
                    try {
                      const textStyle = figma.getStyleById(node.textStyleId);
                      if (textStyle && textStyle.type === 'TEXT') {
                        console.log(`  Text Style: "${textStyle.name}"`);
                      }
                    } catch (e) {
                      console.log(`  No Text Style found`);
                    }
                  } else {
                    console.log(`  No Text Style applied`);
                  }
                }
                
                // Semantic token 매칭
                const matchedToken = findSemanticToken(variableName);
                
                if (matchedToken) {
                  // common 타입은 건너뛰기
                  if (matchedToken.type === 'common') {
                    console.log(`⏭️ Skipping common token: "${matchedToken.name}"`);
                    continue;
                  }
                  
                  // bold 타입인지 먼저 확인
                  const isBoldToken = matchedToken.name.includes('bold') || 
                                     variableName.includes('bold');
                  
                  // text 타입 토큰인 경우 특별 처리
                  if (matchedToken.type === 'text') {
                    console.log(`🔍 Checking text token "${matchedToken.name}" on node "${node.name}" (type: ${node.type})`);
                    
                    // TEXT 노드가 아니면 건너뛰기 (text 토큰은 TEXT 노드에만 적용)
                    if (node.type !== 'TEXT') {
                      console.log(`⏭️ Skipping text token on non-TEXT node: "${node.name}" (${node.type})`);
                      continue;
                    }
                    
                    // TEXT 노드인 경우 Text Style 확인 (bold와 subtle은 예외)
                    if (!isBoldToken && !matchedToken.name.includes('subtle')) {
                      if ('textStyleId' in node && node.textStyleId) {
                        try {
                          const textStyle = figma.getStyleById(node.textStyleId);
                          if (textStyle && textStyle.type === 'TEXT') {
                            const styleName = textStyle.name.toLowerCase();
                            console.log(`📝 Text Style found: "${textStyle.name}"`);
                            
                            // body나 label이 포함되지 않은 Text Style은 건너뛰기
                            if (!styleName.includes('body') && !styleName.includes('label')) {
                              console.log(`⏭️ Skipping - style "${textStyle.name}" doesn't contain body/label`);
                              continue;
                            }
                            console.log(`✅ Style "${textStyle.name}" contains body/label - will apply color`);
                          }
                        } catch (error) {
                          console.log('❌ Could not get text style:', error);
                          continue;
                        }
                      } else {
                        // Text Style이 적용되지 않은 텍스트는 건너뛰기
                        console.log(`⏭️ No Text Style applied to this text node`);
                        continue;
                      }
                    }
                  }
                  
                  // boldOnly 모드에서 non-bold 토큰은 건너뛰기
                  if (applyMode === 'boldOnly' && !isBoldToken) {
                    console.log(`⏭️ Skipping non-bold token in boldOnly mode: "${matchedToken.name}"`);
                    continue;
                  }
                  
                  let colorToApply;
                  
                  if (isBoldToken && keyColor) {
                    // key color의 명도 체크
                    const keyRgb = hexToRgb(keyColor);
                    const keyLuminance = getLuminance(keyRgb.r, keyRgb.g, keyRgb.b);
                    
                    // HSL의 L값 계산 (0-1 범위)
                    const [h, s, l] = rgbToHsl(keyRgb.r, keyRgb.g, keyRgb.b);
                    
                    // L이 80% 초과하면 scale 600 색상 사용
                    if (l > 80) {
                      console.log(`🔆 Key color too bright (L=${l.toFixed(1)}%) - using scale 600 for bold tokens`);
                      const scale600Color = scaleColors.find(c => c.step === 600);
                      if (scale600Color) {
                        colorToApply = scale600Color.hex;
                      } else {
                        colorToApply = keyColor; // fallback
                      }
                    } else {
                      // 일반적인 경우 key color 사용
                      colorToApply = keyColor;
                    }
                    console.log(`✅ Applying ${l > 80 ? 'scale 600' : 'key color'} to bold token: "${matchedToken.name}"`);
                  } else if (applyMode !== 'boldOnly') {
                    // all 모드에서만 일반 토큰에 scale color 적용
                    const scaleColor = scaleColors.find(c => c.step === matchedToken.scale);
                    if (scaleColor) {
                      colorToApply = scaleColor.hex;
                    }
                  }
                  
                  if (colorToApply) {
                    const rgb = hexToRgb(colorToApply);
                    
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
                      
                      // 디버깅: 적용된 토큰 정보
                      console.log(`✅ Applied to "${node.name}"`);
                      console.log(`   Token: ${matchedToken.name}`);
                      console.log(`   Type: ${matchedToken.type}`);
                      console.log(`   Bold: ${isBoldToken}`);
                      console.log(`   Color RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}`);
                      
                      // container + bold 체크
                      const isContainerBold = matchedToken.type === 'container' && isBoldToken;
                      console.log(`   Is container-bold: ${isContainerBold}`);
                      
                      if (isContainerBold) {
                        console.log(`🎯 CONTAINER-BOLD DETECTED!`);
                        
                        // 대비 계산
                        const white = { r: 255, g: 255, b: 255 };
                        const contrast = getContrast(rgb, white);
                        console.log(`📊 Contrast with white: ${contrast.toFixed(2)}:1`);
                        
                        if (contrast < 2.5) {
                          console.log(`⚠️ LOW CONTRAST - ADJUSTING CHILDREN`);
                          
                          // gray900 색상 직접 사용
                          const darkColor = { r: 31, g: 31, b: 31 };
                          
                          // 즉시 자식 처리
                          if ('children' in node && node.children.length > 0) {
                            console.log(`Found ${node.children.length} children`);
                            
                            for (const child of node.children) {
                              await applyDarkColorToNode(child, darkColor);
                            }
                          }
                        }
                      }
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
      if (node.boundVariables && node.boundVariables.strokes) {
        const strokeBinding = node.boundVariables.strokes;
        const bindings = Array.isArray(strokeBinding) ? strokeBinding : [strokeBinding];
        
        for (let i = 0; i < bindings.length; i++) {
          const binding = bindings[i];
          
          if (binding && binding.id) {
            try {
              const variable = await figma.variables.getVariableByIdAsync(binding.id);
              
              if (variable && variable.name) {
                const variableName = variable.name.toLowerCase();
                const matchedToken = findSemanticToken(variableName);
                
                if (matchedToken && matchedToken.type === 'border') {
                  // common 타입은 건너뛰기
                  if (matchedToken.type === 'common') {
                    console.log(`⏭️ Skipping common token: "${matchedToken.name}"`);
                    continue;
                  }
                  
                  // border-bold인지 확인
                  const isBoldToken = matchedToken.name.includes('bold') || 
                                     variableName.includes('bold');
                  
                  // boldOnly 모드에서 non-bold 토큰은 건너뛰기
                  if (applyMode === 'boldOnly' && !isBoldToken) {
                    console.log(`⏭️ Skipping non-bold border in boldOnly mode: "${matchedToken.name}"`);
                    continue;
                  }
                  
                  let colorToApply;
                  
                  if (isBoldToken && keyColor) {
                    colorToApply = keyColor;
                    console.log(`✅ Applying key color to bold border: "${matchedToken.name}"`);
                  } else if (applyMode !== 'boldOnly') {
                    const scaleColor = scaleColors.find(c => c.step === matchedToken.scale);
                    if (scaleColor) {
                      colorToApply = scaleColor.hex;
                    }
                  }
                  
                  if (colorToApply) {
                    const rgb = hexToRgb(colorToApply);
                    
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
                      console.log(`✅ Applied ${isBoldToken ? 'key color' : `scale ${matchedToken.scale}`} border to "${node.name}"`);
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

// 노드에 어두운 색상 직접 적용
async function applyDarkColorToNode(node, darkColor) {
  console.log(`   Checking node: "${node.name}" (type: ${node.type})`);
  
  // TEXT 노드 처리
  if (node.type === 'TEXT') {
    console.log(`   📝 TEXT node found!`);
    
    if (node.fills && node.fills.length > 0) {
      const newFills = [...node.fills];
      
      for (let i = 0; i < newFills.length; i++) {
        if (newFills[i].type === 'SOLID') {
          newFills[i] = {
            type: 'SOLID',
            color: {
              r: darkColor.r / 255,
              g: darkColor.g / 255,
              b: darkColor.b / 255
            }
          };
        }
      }
      
      node.fills = newFills;
      console.log(`   ✅ Changed TEXT color to dark`);
    }
  }
  
  // 재귀적으로 자식 처리
  if ('children' in node && node.children.length > 0) {
    for (const child of node.children) {
      await applyDarkColorToNode(child, darkColor);
    }
  }
}

// 간단한 자식 노드 색상 조정 함수
async function adjustChildrenContrast(containerNode, boldRgb) {
  console.log(`   Adjusting children of "${containerNode.name}"...`);
  
  async function processChild(node, depth = 1) {
    const indent = '   ' + '  '.repeat(depth);
    
    // TEXT 노드 처리
    if (node.type === 'TEXT') {
      console.log(`${indent}Found TEXT: "${node.name}"`);
      
      if (node.fills && node.fills.length > 0) {
        const newFills = [...node.fills];
        
        for (let i = 0; i < newFills.length; i++) {
          if (newFills[i].type === 'SOLID') {
            newFills[i] = {
              type: 'SOLID',
              color: {
                r: boldRgb.r / 255,
                g: boldRgb.g / 255,
                b: boldRgb.b / 255
              }
            };
          }
        }
        
        node.fills = newFills;
        console.log(`${indent}✅ Applied text-neutral-bold`);
      }
    }
    // ICON 처리 (작은 크기 또는 icon 이름)
    else if (node.fills && node.fills.length > 0) {
      const isIcon = node.name.toLowerCase().includes('icon') || 
                     (node.width && node.height && node.width <= 32 && node.height <= 32);
      
      if (isIcon) {
        console.log(`${indent}Found ICON: "${node.name}" (${node.width}x${node.height})`);
        
        const newFills = [...node.fills];
        
        for (let i = 0; i < newFills.length; i++) {
          if (newFills[i].type === 'SOLID') {
            newFills[i] = {
              type: 'SOLID',
              color: {
                r: boldRgb.r / 255,
                g: boldRgb.g / 255,
                b: boldRgb.b / 255
              }
            };
          }
        }
        
        node.fills = newFills;
        console.log(`${indent}✅ Applied icon-neutral-bold`);
      }
    }
    
    // 재귀적으로 자식 처리
    if ('children' in node) {
      for (const child of node.children) {
        await processChild(child, depth + 1);
      }
    }
  }
  
  // 모든 자식 처리
  if ('children' in containerNode) {
    for (const child of containerNode.children) {
      await processChild(child);
    }
  }
}

// container-bold 배경에 대한 텍스트 명도 대비 체크 및 조정
async function checkAndAdjustChildTextContrast(containerNode, containerRgb, textBoldColor, scaleColors) {
  // 흰색 RGB
  const white = { r: 255, g: 255, b: 255 };
  
  // container 배경과 흰색 텍스트의 대비
  const whiteContrast = getContrast(containerRgb, white);
  
  // 명도 대비 기준: 2.5:1
  const needsBoldText = whiteContrast < 2.5;
  
  console.log(`🎨 Container "${containerNode.name}" background rgb(${containerRgb.r}, ${containerRgb.g}, ${containerRgb.b})`);
  console.log(`📊 White text contrast: ${whiteContrast.toFixed(2)}:1`);
  
  if (needsBoldText) {
    console.log(`⚠️ Low contrast detected (< 2.5:1) - applying semantic bold colors to children`);
    
    // text-neutral-bold 색상 (scale 900)
    const textBoldRgb = textBoldColor ? hexToRgb(textBoldColor.hex) : { r: 31, g: 31, b: 31 };
    // icon-neutral-bold도 같은 scale 900 사용
    const iconBoldRgb = textBoldRgb;
    
    console.log(`📝 text-neutral-bold color: rgb(${textBoldRgb.r}, ${textBoldRgb.g}, ${textBoldRgb.b})`);
    
    // 자식 노드들을 순회하며 색상 변경
    async function adjustChildrenColors(node, depth = 0) {
      const indent = '  '.repeat(depth);
      
      // TEXT 노드인 경우 - text-neutral-bold 적용
      if (node.type === 'TEXT') {
        console.log(`${indent}📄 Found TEXT node: "${node.name}"`);
        
        if ('fills' in node && node.fills.length > 0) {
          const newFills = [...node.fills];
          let changed = false;
          
          for (let i = 0; i < newFills.length; i++) {
            if (newFills[i] && newFills[i].type === 'SOLID') {
              // 현재 색상 확인
              const currentColor = {
                r: newFills[i].color.r * 255,
                g: newFills[i].color.g * 255,
                b: newFills[i].color.b * 255
              };
              
              // container와의 대비 확인
              const currentContrast = getContrast(containerRgb, currentColor);
              
              if (currentContrast < 2.5) {
                newFills[i] = {
                  type: 'SOLID',
                  color: {
                    r: textBoldRgb.r / 255,
                    g: textBoldRgb.g / 255,
                    b: textBoldRgb.b / 255
                  }
                };
                changed = true;
              }
            }
          }
          
          if (changed) {
            node.fills = newFills;
            console.log(`${indent}✅ Applied text-neutral-bold to TEXT "${node.name}"`);
          }
        }
      }
      // ICON 타입 노드들 (보통 Frame, Rectangle 등) - icon-neutral-bold 적용
      else if ('fills' in node && node.fills.length > 0) {
        // icon이 포함된 이름이거나 작은 사이즈의 요소
        const isIcon = node.name.toLowerCase().includes('icon') || 
                       node.name.toLowerCase().includes('ico') ||
                       (node.width <= 32 && node.height <= 32);
        
        if (isIcon) {
          console.log(`${indent}🎯 Found potential ICON node: "${node.name}" (${node.width}x${node.height})`);
          
          const newFills = [...node.fills];
          let changed = false;
          
          for (let i = 0; i < newFills.length; i++) {
            if (newFills[i] && newFills[i].type === 'SOLID') {
              const currentColor = {
                r: newFills[i].color.r * 255,
                g: newFills[i].color.g * 255,
                b: newFills[i].color.b * 255
              };
              
              const currentContrast = getContrast(containerRgb, currentColor);
              
              if (currentContrast < 2.5) {
                newFills[i] = {
                  type: 'SOLID',
                  color: {
                    r: iconBoldRgb.r / 255,
                    g: iconBoldRgb.g / 255,
                    b: iconBoldRgb.b / 255
                  }
                };
                changed = true;
              }
            }
          }
          
          if (changed) {
            node.fills = newFills;
            console.log(`${indent}✅ Applied icon-neutral-bold to "${node.name}"`);
          }
        }
      }
      
      // 자식 노드들도 재귀적으로 처리
      if ('children' in node) {
        for (const child of node.children) {
          await adjustChildrenColors(child, depth + 1);
        }
      }
    }
    
    // container의 자식들 처리
    if ('children' in containerNode) {
      console.log(`🔍 Processing ${containerNode.children.length} children of container...`);
      for (const child of containerNode.children) {
        await adjustChildrenColors(child);
      }
    }
  } else {
    console.log(`✅ Contrast is sufficient (${whiteContrast.toFixed(2)}:1 >= 2.5:1)`);
  }
}

// 간단화된 Semantic Token 매칭 함수
function findSemanticToken(variableName) {
  // Variable 이름을 정규화
  const normalizedName = variableName.toLowerCase()
    .replace(/\s+/g, '/') // 공백을 슬래시로
    .replace(/_/g, '/') // 언더스코어를 슬래시로
    .replace(/\./g, '/') // 점을 슬래시로
    .replace(/\/+/g, '/'); // 연속된 슬래시 제거
  
  console.log(`Checking variable: "${variableName}" (normalized: "${normalizedName}")`);
  
  // 직접 매칭 시도
  for (const [tokenPath, tokenConfig] of Object.entries(SEMANTIC_TOKEN_MAPPING)) {
    // semantic/ 접두사 처리
    const patterns = [
      tokenPath,
      `semantic/${tokenPath}`,
      tokenPath.replace('/', '-'),
      tokenPath.replace('/', '_')
    ];
    
    for (const pattern of patterns) {
      if (normalizedName.includes(pattern)) {
        console.log(`✅ Matched to ${tokenPath} (scale: ${tokenConfig.scale})`);
        return {
          name: tokenPath,
          scale: tokenConfig.scale,
          type: tokenConfig.type
        };
      }
    }
  }
  
  // gray/neutral 관련 키워드가 없으면 null 반환
  const isNeutralToken = /neutral|gray|grey/.test(normalizedName);
  const isSemanticToken = /semantic|background|surface|container|text|icon|border|common/.test(normalizedName);
  
  if (!isNeutralToken || !isSemanticToken) {
    return null;
  }
  
  console.log(`⚠️ No exact match found for: "${variableName}"`);
  return null;
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

// 유틸리티 함수: 명도 계산
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// 유틸리티 함수: 명도 대비 계산
function getContrast(rgb1, rgb2) {
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// 유틸리티 함수: RGB를 HSL로 변환
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return [h * 360, s * 100, l * 100]; // H: 0-360, S: 0-100, L: 0-100
}

// 플러그인 종료 처리
figma.on('close', () => {
  // 정리 작업이 필요한 경우 여기에 추가
});