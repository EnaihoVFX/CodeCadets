// LPC Character Generator Integration
// Uses the actual LPC sprite assets from the Universal LPC Spritesheet Character Generator
// References: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator

class LPCIntegration {
  constructor() {
    this.generatorUrl = 'https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/';
    this.spriteBaseUrl = 'https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/';
    this.sheetDefinitionsUrl = `${this.spriteBaseUrl}sheet_definitions/`;
    this.spritesheetsUrl = `${this.spriteBaseUrl}spritesheets/`;
    this.sheetDefinitions = {};
    this.loadedSprites = {};
    this.iframe = null;
  }

  // Create hidden iframe to access LPC generator
  createGeneratorIframe() {
    if (this.iframe) return this.iframe;
    
    this.iframe = document.createElement('iframe');
    this.iframe.style.display = 'none';
    this.iframe.src = this.generatorUrl;
    this.iframe.onload = () => {
      console.log('[LPC] Generator iframe loaded');
    };
    document.body.appendChild(this.iframe);
    return this.iframe;
  }

  // Request character export from generator
  async requestCharacterExport(config) {
    try {
      const iframe = this.createGeneratorIframe();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for character export'));
        }, 10000);

        const messageHandler = (event) => {
          if (event.origin !== 'https://liberatedpixelcup.github.io') return;
          
          if (event.data && event.data.type === 'lpc-character-export') {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            resolve(event.data);
          }
        };

        window.addEventListener('message', messageHandler);
        
        // Send configuration to generator
        iframe.contentWindow.postMessage({
          type: 'lpc-export-request',
          config: config
        }, this.generatorUrl);
      });
    } catch (error) {
      console.error('[LPC] Error requesting character export:', error);
      return null;
    }
  }

  async loadSheetDefinitions() {
    try {
      // Load the main sheet definitions
      // The LPC generator uses JSON files to define sprite layouts
      const response = await fetch(`${this.sheetDefinitionsUrl}male.json`);
      if (response.ok) {
        const data = await response.json();
        this.sheetDefinitions.male = data;
      }
    } catch (error) {
      console.warn('[LPC] Could not load sheet definitions, using fallback:', error);
    }
  }

  async loadSpriteSheet(sheetName) {
    if (this.loadedSprites[sheetName]) {
      return this.loadedSprites[sheetName];
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          this.loadedSprites[sheetName] = img;
          resolve(img);
        };
        img.onerror = () => {
          // Try alternative paths
          const altPaths = [
            `${this.spritesheetsUrl}${sheetName}.png`,
            `${this.spritesheetsUrl}${sheetName}_sheet.png`,
            `${this.spriteBaseUrl}spritesheets/${sheetName}.png`
          ];
          
          let currentPath = 0;
          const tryNext = () => {
            if (currentPath >= altPaths.length) {
              console.warn(`[LPC] Could not load sprite sheet: ${sheetName} from any path`);
              reject(new Error(`Failed to load ${sheetName}`));
              return;
            }
            
            const altImg = new Image();
            altImg.crossOrigin = 'anonymous';
            altImg.onload = () => {
              this.loadedSprites[sheetName] = altImg;
              resolve(altImg);
            };
            altImg.onerror = () => {
              currentPath++;
              tryNext();
            };
            altImg.src = altPaths[currentPath];
          };
          
          tryNext();
        };
        img.src = `${this.spritesheetsUrl}${sheetName}.png`;
      });
    } catch (error) {
      console.error(`[LPC] Error loading sprite sheet ${sheetName}:`, error);
      return null;
    }
  }

  // Get sprite from sheet using LPC format
  // LPC sprites are typically 64x64 pixels per frame
  getSpriteFromSheet(sheet, frameX, frameY, width = 64, height = 64) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    ctx.drawImage(
      sheet,
      frameX * width,
      frameY * height,
      width,
      height,
      0,
      0,
      width,
      height
    );
    
    return canvas;
  }

  // Get idle animation frame (frame 0 of idle animation)
  // LPC idle animation is typically in row 0, columns 0-3
  // LPC sprites are 64x64 pixels per frame, arranged in a grid
  async getIdleFrame(baseType = 'male', part = 'base', option = 'none', frame = 0) {
    if (option === 'none' && part !== 'base') {
      return null;
    }

    try {
      // For base, use the actual LPC base sprites
      if (part === 'base') {
        // LPC base sprites are in files like: male.png, female.png, etc.
        const sheetName = option; // 'male', 'female', 'child'
        const sheet = await this.loadSpriteSheet(sheetName);
        if (!sheet) return null;
        
        // Idle animation: row 0 (y=0), frame 0 (x=0) for idle pose
        return this.getSpriteFromSheet(sheet, 0, 0, 64, 64);
      }

      // For other parts, try to load composite sprites
      // LPC uses layered sprites that combine on top of base
      let sheetName = this.getSheetName(part, option, baseType);
      if (!sheetName) return null;

      const sheet = await this.loadSpriteSheet(sheetName);
      if (!sheet) return null;

      // Idle animation is typically row 0, frames 0-3
      // We use frame 0 for static idle pose
      return this.getSpriteFromSheet(sheet, 0, 0, 64, 64);
    } catch (error) {
      console.warn(`[LPC] Error getting idle frame for ${part}/${option}:`, error);
      return null;
    }
  }

  // Alternative: Use the hosted generator's export via iframe
  async exportCharacterFromGenerator(config) {
    // This would communicate with the LPC generator iframe
    // to get a properly composed character
    return null;
  }

  getSheetName(part, option, baseType) {
    // Map our simplified part names to LPC sheet names
    // This is a simplified mapping - the actual LPC generator has more complex naming
    const mappings = {
      base: {
        male: 'male',
        female: 'female',
        child: 'child'
      },
      hair: {
        short: 'male_hair_short',
        long: 'male_hair_long',
        ponytail: 'male_hair_ponytail',
        curly: 'male_hair_curly'
      },
      shirt: {
        tunic: 'male_tunic',
        shirt: 'male_shirt',
        dress: 'female_dress',
        armor: 'male_armor'
      },
      pants: {
        pants: 'male_pants',
        skirt: 'female_skirt',
        shorts: 'male_shorts'
      },
      shoes: {
        boots: 'male_boots',
        sandals: 'male_sandals',
        shoes: 'male_shoes'
      },
      weapon: {
        sword: 'sword',
        bow: 'bow',
        staff: 'staff'
      },
      shield: {
        round: 'shield_round',
        kite: 'shield_kite'
      }
    };

    const partMapping = mappings[part];
    if (!partMapping) return null;

    const sheetName = partMapping[option];
    if (!sheetName) return null;

    // Adjust for base type
    if (part !== 'base' && baseType === 'female') {
      return sheetName.replace('male_', 'female_');
    }

    return sheetName;
  }
}

// Create global instance
const lpcIntegration = new LPCIntegration();

