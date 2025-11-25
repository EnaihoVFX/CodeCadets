const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 64;
const FRONT_FRAME = { col: 0, row: 2 };

// Custom Character Builder UI
// Builds avatars using LPC sprites vendored into assets/lpc/

class CharacterBuilder {
  constructor() {
    this.renderOrder = ['body', 'pants', 'shoes', 'shirt', 'hair'];
    this.characterConfig = {
      gender: 'male',
      skinTone: 'light',
      hair: 'bangs',
      shirt: 'teal_shirt',
      pants: 'teal_pants',
      shoes: 'black_shoes'
    };
    this.genderOptions = ['male', 'female'];
    this.skinToneOptions = ['light', 'tanned', 'dark'];
    this.options = {
      hair: ['bangs', 'long', 'ponytail', 'none'],
      shirt: ['teal_shirt', 'white_shirt', 'maroon_shirt', 'none'],
      pants: ['teal_pants', 'white_pants', 'red_pants', 'none'],
      shoes: ['black_shoes', 'brown_shoes', 'none']
    };
    this.assetManifest = {
      body: {
        male_light: 'assets/lpc/body/male_light.png',
        male_tanned: 'assets/lpc/body/male_tanned.png',
        male_dark: 'assets/lpc/body/male_dark.png',
        female_light: 'assets/lpc/body/female_light.png',
        female_tanned: 'assets/lpc/body/female_tanned.png',
        female_dark: 'assets/lpc/body/female_dark.png'
      },
      hair: {
        bangs: 'assets/lpc/hair/bangs.png',
        long: 'assets/lpc/hair/long.png',
        ponytail: 'assets/lpc/hair/ponytail.png'
      },
      shirt: {
        male: {
          teal_shirt: 'assets/lpc/torso/male_teal_shirt.png',
          white_shirt: 'assets/lpc/torso/male_white_shirt.png',
          maroon_shirt: 'assets/lpc/torso/male_maroon_shirt.png'
        },
        female: {
          teal_shirt: 'assets/lpc/torso/female_teal_shirt.png',
          white_shirt: 'assets/lpc/torso/female_white_shirt.png',
          maroon_shirt: 'assets/lpc/torso/female_maroon_shirt.png'
        }
      },
      pants: {
        male: {
          teal_pants: 'assets/lpc/legs/male_teal_pants.png',
          white_pants: 'assets/lpc/legs/male_white_pants.png',
          red_pants: 'assets/lpc/legs/male_red_pants.png'
        },
        female: {
          teal_pants: 'assets/lpc/legs/female_teal_pants.png',
          white_pants: 'assets/lpc/legs/female_white_pants.png',
          red_pants: 'assets/lpc/legs/female_red_pants.png'
        }
      },
      shoes: {
        male: {
          black_shoes: 'assets/lpc/feet/male_black_shoes.png',
          brown_shoes: 'assets/lpc/feet/male_brown_shoes.png'
        },
        female: {
          black_shoes: 'assets/lpc/feet/female_black_shoes.png',
          brown_shoes: 'assets/lpc/feet/female_brown_shoes.png'
        }
      }
    };
    this.canvas = null;
    this.ctx = null;
    this.imageCache = new Map();
    this.placeholderSprites = {};
    this.partColors = {
      hair: '#5a3825',
      shirt: '#34d399',
      pants: '#2563eb',
      shoes: '#1f2937'
    };
    this.colorInputs = {};
    this.tintCache = new Map();
  }

  async init() {
    this.setupCanvas();
    this.setupUI();
    await this.render();
  }

  setupCanvas() {
    const container = document.getElementById('character-canvas-container');
    if (!container) {
      console.error('[Character Builder] Canvas container not found!');
      return;
    }
    
    // Clear container first
    container.innerHTML = '';
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = 64;
    this.canvas.height = 64;
    // Let CSS handle styling - just set size for proper pixel rendering
    this.canvas.style.width = '400px';
    this.canvas.style.height = '400px';
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.imageRendering = '-moz-crisp-edges';
    this.canvas.style.imageRendering = 'crisp-edges';
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    container.appendChild(this.canvas);
    console.log('[Character Builder] ✅ Canvas set up successfully');
  }

  setupUI() {
    this.createToggleGroup('gender', this.genderOptions, 'GENDER');
    this.createToggleGroup('skinTone', this.skinToneOptions, 'SKIN');
    const parts = Object.keys(this.options);
    parts.forEach(part => this.createPartSelector(part));
    this.setupColorControls();
  }

  createPartSelector(part) {
    const container = document.getElementById('character-parts-selector');
    if (!container) return;
    const partContainer = document.createElement('div');
    partContainer.className = 'character-part-selector';
    partContainer.dataset.part = part;

    const label = document.createElement('div');
    label.className = 'part-label';
    label.textContent = this.formatPartLabel(part);

    const controls = document.createElement('div');
    controls.className = 'part-controls';

    const leftBtn = document.createElement('button');
    leftBtn.className = 'part-btn part-btn-left';
    leftBtn.textContent = '◄';
    leftBtn.onclick = () => this.cyclePart(part, -1);

    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'part-value';
    valueDisplay.id = `part-value-${part}`;
    valueDisplay.textContent = this.formatOptionLabel(part, this.characterConfig[part]);

    const rightBtn = document.createElement('button');
    rightBtn.className = 'part-btn part-btn-right';
    rightBtn.textContent = '►';
    rightBtn.onclick = () => this.cyclePart(part, 1);

    controls.appendChild(leftBtn);
    controls.appendChild(valueDisplay);
    controls.appendChild(rightBtn);
    partContainer.appendChild(label);
    partContainer.appendChild(controls);
    container.appendChild(partContainer);
  }

  createToggleGroup(key, options, label) {
    const groupId = key === 'skinTone' ? 'skin-toggle' : `${key}-toggle`;
    const group = document.getElementById(groupId);
    if (!group) return;
    const optionsContainer = group.querySelector('.toggle-options');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';
    options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'toggle-btn';
      btn.dataset.value = option;
      btn.textContent = this.formatToggleLabel(key, option);
      btn.onclick = () => {
        this.characterConfig[key] = option;
        this.updateToggleState(key);
        this.render();
      };
      optionsContainer.appendChild(btn);
    });
    this.updateToggleState(key);
  }

  updateToggleState(key) {
    const groupId = key === 'skinTone' ? 'skin-toggle' : `${key}-toggle`;
    const group = document.getElementById(groupId);
    if (!group) return;
    const optionsContainer = group.querySelector('.toggle-options');
    if (!optionsContainer) return;
    optionsContainer.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === this.characterConfig[key]);
    });
  }

  setupColorControls() {
    const container = document.getElementById('color-customization');
    if (!container) return;
    Object.keys(this.partColors).forEach(part => {
      const input = container.querySelector(`input[data-color-part="${part}"]`);
      if (!input) return;
      this.colorInputs[part] = input;
      input.value = this.partColors[part];
      input.addEventListener('input', (event) => {
        this.partColors[part] = event.target.value;
        this.tintCache.clear();
        this.render();
      });
    });
  }

  updateColorInput(part) {
    const input = this.colorInputs[part];
    if (input) {
      input.value = this.partColors[part];
    }
  }

  updateAllColorInputs() {
    Object.keys(this.partColors).forEach(part => this.updateColorInput(part));
  }

  formatToggleLabel(key, option) {
    if (key === 'gender') {
      return option === 'male' ? '👦 Boy' : '👧 Girl';
    }
    if (key === 'skinTone') {
      const skinNames = {
        light: 'Light',
        tanned: 'Medium',
        dark: 'Dark'
      };
      return skinNames[option] || option.charAt(0).toUpperCase() + option.slice(1);
    }
    return option.toUpperCase();
  }

  formatPartLabel(part) {
    const labels = {
      hair: '💇 HAIR',
      shirt: '👕 TOP',
      pants: '👖 BOTTOM',
      shoes: '👟 SHOES'
    };
    return labels[part] || part.toUpperCase();
  }

  formatOptionLabel(part, option) {
    if (!option || option === 'none') return 'None';
    const niceNames = {
      hair: {
        bangs: 'Short',
        long: 'Long',
        ponytail: 'Ponytail'
      },
      shirt: {
        teal_shirt: 'Teal',
        white_shirt: 'White',
        maroon_shirt: 'Red'
      },
      pants: {
        teal_pants: 'Teal',
        white_pants: 'White',
        red_pants: 'Red'
      },
      shoes: {
        black_shoes: 'Black',
        brown_shoes: 'Brown'
      }
    };
    return niceNames[part]?.[option] || option.replace(/_/g, ' ').replace(/shirt|pants|shoes/g, '').trim();
  }

  async cyclePart(part, direction) {
    const options = this.options[part];
    const currentIndex = options.indexOf(this.characterConfig[part]);
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = options.length - 1;
    if (newIndex >= options.length) newIndex = 0;
    this.characterConfig[part] = options[newIndex];
    this.updatePartDisplay(part);
    await this.render();
  }

  updatePartDisplay(part) {
    const valueDisplay = document.getElementById(`part-value-${part}`);
    if (valueDisplay) {
      valueDisplay.textContent = this.formatOptionLabel(part, this.characterConfig[part]);
    }
  }

  async render() {
    if (!this.ctx) {
      console.error('[Character Builder] No canvas context available!');
      return;
    }
    console.log('[Character Builder] 🎨 Rendering character...');
    // Clear canvas with transparent background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Don't fill with black - keep transparent so sprites show properly
    const bodyKey = `${this.characterConfig.gender}_${this.characterConfig.skinTone}`;
    console.log('[Character Builder] Drawing body:', bodyKey);
    await this.drawLayer('body', bodyKey);
    for (const part of this.renderOrder.filter(p => p !== 'body')) {
      const option = this.characterConfig[part];
      if (!option || option === 'none') continue;
      console.log('[Character Builder] Drawing part:', part, option);
      await this.drawLayer(part, option);
    }
    console.log('[Character Builder] ✅ Character rendered!');
  }

  async drawLayer(part, option) {
    try {
      const img = await this.getLayerImage(part, option);
      if (img) {
        const sprite = this.shouldColorize(part)
          ? this.applyColorTint(img, this.partColors[part], `${part}_${option}_${this.characterConfig.gender}`)
          : img;
        this.drawFrame(sprite);
        console.log('[Character Builder] ✅ Drew layer:', part, option);
      } else {
        console.warn('[Character Builder] ⚠️ No image for layer, using placeholder:', part, option);
        this.drawPlaceholder(part, option);
      }
    } catch (error) {
      console.error('[Character Builder] ❌ Error drawing layer:', part, option, error);
      this.drawPlaceholder(part, option);
    }
  }

  async getLayerImage(part, option) {
    let path;
    if (part === 'body') {
      path = this.assetManifest.body[option];
    } else if (part === 'shirt' || part === 'pants' || part === 'shoes') {
      const genderMap = this.assetManifest[part]?.[this.characterConfig.gender];
      path = genderMap?.[option];
    } else {
      path = this.assetManifest[part]?.[option];
    }
    if (!path) return null;
    return this.loadImage(path);
  }

  loadImage(path) {
    if (this.imageCache.has(path)) {
      return this.imageCache.get(path);
    }
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('[Character Builder] ✅ Loaded image:', path);
        resolve(img);
      };
      img.onerror = (error) => {
        console.error('[Character Builder] ❌ Failed to load:', path, error);
        reject(new Error(`Failed to load ${path}`));
      };
      
      // Convert relative path to extension URL if in Chrome extension context
      let imageUrl = path;
      
      // Check if we're in a Chrome extension context
      let runtime = null;
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
        runtime = chrome.runtime;
      } else if (typeof browser !== 'undefined' && browser.runtime && typeof browser.runtime.getURL === 'function') {
        runtime = browser.runtime;
      }
      
      if (runtime) {
        // If path doesn't start with chrome-extension:// or data: or http, convert it
        if (!path.startsWith('chrome-extension://') && 
            !path.startsWith('moz-extension://') &&
            !path.startsWith('data:') && 
            !path.startsWith('http://') && 
            !path.startsWith('https://')) {
          try {
            imageUrl = runtime.getURL(path);
            console.log('[Character Builder] ✅ Converting path:', path, '→', imageUrl);
          } catch (e) {
            console.warn('[Character Builder] Error converting path with getURL:', e);
            // Fallback: if we're in extension context but getURL fails, try direct path
            if (window.location.protocol === 'chrome-extension:') {
              const extensionId = window.location.hostname;
              imageUrl = `chrome-extension://${extensionId}/${path}`;
              console.log('[Character Builder] Using fallback URL:', imageUrl);
            }
          }
        }
      } else {
        // Not in extension context
        if (window.location.protocol === 'file:') {
          console.error('[Character Builder] ⚠️ Page opened as file:// - images cannot load due to CORS.');
          console.error('[Character Builder] 💡 Please open the profile page through the extension (click profile icon in popup).');
        } else if (window.location.protocol === 'chrome-extension:') {
          // We're in extension but chrome.runtime might not be available
          // Try to construct URL from current location
          const baseUrl = window.location.origin;
          imageUrl = `${baseUrl}/${path}`;
          console.log('[Character Builder] Using origin-based URL:', imageUrl);
        }
      }
      
      console.log('[Character Builder] Loading image from:', imageUrl);
      img.src = imageUrl;
    }).catch(error => {
      console.warn('[Character Builder] Missing asset:', path, error);
      return null;
    });
    this.imageCache.set(path, promise);
    return promise;
  }

  drawFrame(img) {
    const sx = FRONT_FRAME.col * FRAME_WIDTH;
    const sy = FRONT_FRAME.row * FRAME_HEIGHT;
    this.ctx.drawImage(img, sx, sy, FRAME_WIDTH, FRAME_HEIGHT, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  }

  drawPlaceholder(part, option) {
    let key = `${part}_${option}`;
    if (part === 'shirt' || part === 'pants' || part === 'shoes') {
      key += `_${this.characterConfig.gender}`;
    } else if (part === 'body') {
      key = `${part}_${this.characterConfig.gender}_${this.characterConfig.skinTone}`;
    }
    if (!this.placeholderSprites[key]) {
      this.placeholderSprites[key] = this.createPlaceholderSprite(part, option);
    }
    const sprite = this.placeholderSprites[key];
    if (sprite) {
      this.ctx.drawImage(sprite, 0, 0);
    }
  }

  shouldColorize(part) {
    return Object.prototype.hasOwnProperty.call(this.partColors, part);
  }

  applyColorTint(image, color, cacheKey) {
    if (!color) return image;
    const cacheKeyWithColor = `${cacheKey}_${color}`;
    if (this.tintCache.has(cacheKeyWithColor)) {
      return this.tintCache.get(cacheKeyWithColor);
    }
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const tint = this.hexToRgb(color);
    if (!tint) return image;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha === 0) continue;
      data[i] = Math.min(255, (data[i] / 255) * tint.r);
      data[i + 1] = Math.min(255, (data[i + 1] / 255) * tint.g);
      data[i + 2] = Math.min(255, (data[i + 2] / 255) * tint.b);
    }
    ctx.putImageData(imageData, 0, 0);
    this.tintCache.set(cacheKeyWithColor, canvas);
    return canvas;
  }

  hexToRgb(hex) {
    if (!hex) return null;
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) return null;
    const bigint = parseInt(normalized, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  createPlaceholderSprite(part, option) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const colors = {
      body: {
        male_light: '#d4a574',
        male_tanned: '#b8845c',
        male_dark: '#8a5a35',
        female_light: '#f4c0a0',
        female_tanned: '#d89872',
        female_dark: '#8a5431'
      }
    };
    let color = '#94a3b8';
    if (part === 'body') {
      const bodyKey = `${this.characterConfig.gender}_${this.characterConfig.skinTone}`;
      color = colors.body[bodyKey] || colors.body.male_light;
    } else if (this.shouldColorize(part) && this.partColors[part]) {
      color = this.partColors[part];
    }
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    switch (part) {
      case 'body':
        ctx.beginPath();
        ctx.arc(32, 18, 12, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillRect(24, 30, 16, 22);
        ctx.strokeRect(24, 30, 16, 22);
        ctx.fillRect(22, 52, 9, 12);
        ctx.fillRect(33, 52, 9, 12);
        break;
      case 'hair':
        ctx.beginPath();
        ctx.arc(32, 15, 16, Math.PI, 0);
        ctx.fill(); ctx.stroke();
        break;
      case 'shirt':
        ctx.fillRect(24, 32, 16, 18);
        ctx.strokeRect(24, 32, 16, 18);
        break;
      case 'pants':
        ctx.fillRect(24, 50, 8, 12);
        ctx.fillRect(32, 50, 8, 12);
        ctx.strokeRect(24, 50, 8, 12);
        ctx.strokeRect(32, 50, 8, 12);
        break;
      case 'shoes':
        ctx.fillRect(24, 60, 8, 4);
        ctx.fillRect(32, 60, 8, 4);
        ctx.strokeRect(24, 60, 8, 4);
        ctx.strokeRect(32, 60, 8, 4);
        break;
    }
    return canvas;
  }

  normalizeConfig(config) {
    const normalized = { ...config };
    if (config.body && (!config.gender || !config.skinTone)) {
      const [maybeGender, maybeTone] = config.body.split('_');
      if (maybeGender && maybeTone) {
        normalized.gender = maybeGender;
        normalized.skinTone = maybeTone;
      }
    }
    delete normalized.body;
    if (!normalized.gender) {
      normalized.gender = config.base?.startsWith('f') ? 'female' : 'male';
    }
    if (!normalized.skinTone) {
      normalized.skinTone = 'light';
    }
    if (config.colors) {
      normalized.colors = { ...config.colors };
    }
    if (config.hair && !this.options.hair.includes(config.hair)) {
      const hairMap = { short: 'bangs', long: 'long', ponytail: 'ponytail', curly: 'long' };
      normalized.hair = hairMap[config.hair] || this.characterConfig.hair;
    }
    if (config.shirt && !this.options.shirt.includes(config.shirt)) {
      normalized.shirt = config.shirt === 'dress' ? 'white_shirt' : 'teal_shirt';
    }
    if (config.pants && !this.options.pants.includes(config.pants)) {
      normalized.pants = 'teal_pants';
    }
    if (config.shoes && !this.options.shoes.includes(config.shoes)) {
      normalized.shoes = config.shoes === 'sandals' ? 'brown_shoes' : 'black_shoes';
    }
    return normalized;
  }

  async loadFromJSON(json) {
    try {
      const config = typeof json === 'string' ? JSON.parse(json) : json;
      const normalized = this.normalizeConfig(config);
      const { colors, ...rest } = normalized;
      this.characterConfig = { ...this.characterConfig, ...rest };
      if (colors) {
        this.partColors = { ...this.partColors, ...colors };
        this.tintCache.clear();
      }
      Object.keys(this.options).forEach(part => this.updatePartDisplay(part));
      this.updateToggleState('gender');
      this.updateToggleState('skinTone');
      this.updateAllColorInputs();
      await this.render();
    } catch (error) {
      console.error('[Character Builder] Error loading config:', error);
    }
  }

  async loadSavedConfig() {
    try {
      if (!databaseService || !databaseService.userId) return false;
      const dataKey = databaseService.getUserKey('avatarData');
      const result = await chrome.storage.local.get([dataKey]);
      if (result[dataKey]) {
        await this.loadFromJSON(result[dataKey]);
        return true;
      }
    } catch (error) {
      console.error('[Character Builder] Failed to load saved config:', error);
    }
    return false;
  }

  async exportToImage() {
    await this.render();
    return this.canvas.toDataURL('image/png');
  }

  exportToJSON() {
    const body = `${this.characterConfig.gender}_${this.characterConfig.skinTone}`;
    return JSON.stringify({ ...this.characterConfig, body, colors: this.partColors });
  }
}

let characterBuilder = null;

async function initializeCharacterBuilder() {
  const canvasContainer = document.getElementById('character-canvas-container');
  if (!canvasContainer) {
    console.error('[Character Builder] Canvas container not found!');
    return;
  }
  
  // Always create a new instance to ensure fresh state
  // This ensures images reload correctly each time modal opens
  characterBuilder = new CharacterBuilder();
  console.log('[Character Builder] Creating new builder instance...');
  await characterBuilder.init();
  console.log('[Character Builder] Builder initialized, loading saved config...');
  await characterBuilder.loadSavedConfig();
  console.log('[Character Builder] ✅ Ready!');
}

if (typeof window !== 'undefined') {
  window.getCharacterBuilder = () => characterBuilder;
  window.exportCharacter = async () => {
    if (!characterBuilder) return null;
    const image = await characterBuilder.exportToImage();
    const json = characterBuilder.exportToJSON();
    return { image, json };
  };
}
