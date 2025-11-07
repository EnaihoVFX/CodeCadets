// Comprehensive test script for selector-map.json
// Run this in the browser console on a Scratch editor page

(function() {
  console.log('🧪 Starting comprehensive selector map test...\n');

  // Load selector map from JSON
  let SELECTOR_MAP = {};
  fetch(chrome.runtime.getURL('selector-map.json'))
    .then(r => r.json())
    .then(json => {
      SELECTOR_MAP = json;
      runTests();
    })
    .catch(err => {
      console.error('❌ Failed to load selector-map.json:', err);
      // Try to use window.SELECTOR_MAP if available
      if (window.SELECTOR_MAP) {
        SELECTOR_MAP = window.SELECTOR_MAP;
        runTests();
      } else {
        console.error('❌ No selector map available');
      }
    });

  function resolveKey(key) {
    if (!key || typeof key !== 'string') return null;
    
    const parts = key.split('.');
    let def = SELECTOR_MAP;
    for (const part of parts) {
      if (!def || typeof def !== 'object') break;
      def = def[part];
    }
    
    if (def && typeof def === 'object') {
      if (def.main) def = def.main;
      else if (def.canvas) def = def.canvas;
    }
    
    if (!def || typeof def !== 'object') return null;
    
    // Try CSS selectors
    if (Array.isArray(def.css)) {
      for (const cssSel of def.css) {
        try {
          const all = Array.from(document.querySelectorAll(cssSel));
          if (all.length > 0) {
            if (key.startsWith('flyout.block.')) {
              const inFlyout = all.find(el => el.closest('.blocklyFlyout'));
              if (inFlyout) return inFlyout;
            }
            return all[0];
          }
        } catch (_) {}
      }
    }
    
    // Try domtext
    if (Array.isArray(def.domtext)) {
      for (const text of def.domtext) {
        const found = findByDomText(text.toLowerCase());
        if (found) return found;
      }
    }
    
    // Try text
    if (Array.isArray(def.text)) {
      for (const text of def.text) {
        const found = findByTextInToolbox(text);
        if (found) return found;
      }
    }
    
    return null;
  }

  function findByDomText(query) {
    const all = Array.from(document.querySelectorAll('div, span, button, [role], [aria-label]'));
    let best = null;
    let bestScore = -Infinity;
    for (const el of all) {
      const txt = (el.textContent || '').trim().toLowerCase();
      if (!txt || !txt.includes(query)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 16) continue;
      let score = 0;
      score += Math.max(0, 2000 - (r.width * r.height) / 10);
      const cls = (el.className || '').toString().toLowerCase();
      if (cls.includes('sprite')) score += 300;
      const anc = el.closest('[class*="sprite" i]');
      if (anc) score += 200;
      if (score > bestScore) { bestScore = score; best = el; }
    }
    return best;
  }

  function findByTextInToolbox(text) {
    const containers = document.querySelectorAll('.blocklyToolboxDiv, .blocklyToolbox, .blocklyFlyout, body');
    const t = text.trim().toLowerCase();
    let best = null;
    let bestScore = -Infinity;
    containers.forEach(container => {
      const els = container.querySelectorAll('*');
      els.forEach(el => {
        const label = (el.getAttribute && el.getAttribute('aria-label')) || '';
        const txt = (el.textContent || '').trim().toLowerCase();
        const matches = label.toLowerCase() === t || txt === t || txt.includes(t);
        if (!matches) return;
        const r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 16) return;
        let score = 0;
        if (label.toLowerCase() === t) score += 5;
        if (el.getAttribute('role') === 'button' || el.tagName === 'BUTTON') score += 3;
        if (el.className && /toolbox|category|tree/i.test(el.className)) score += 2;
        score += Math.max(0, 3000 - (r.width * r.height) / 10);
        if (score > bestScore) { bestScore = score; best = el; }
      });
    });
    return best;
  }

  function enumerateKeys() {
    const out = [];
    const walk = (node, prefix = []) => {
      if (!node || typeof node !== 'object') return;
      const hasLeaf = !!(node.css || node.domtext || node.text || node.flyoutText);
      if (hasLeaf) {
        if (prefix.length) out.push(prefix.join('.'));
        return;
      }
      for (const k of Object.keys(node)) {
        walk(node[k], prefix.concat(k));
      }
    };
    walk(SELECTOR_MAP, []);
    return out;
  }

  function runTests() {
    const keys = enumerateKeys();
    const results = {
      total: keys.length,
      found: 0,
      missing: 0,
      errors: 0,
      byCategory: {},
      details: []
    };

    console.log(`📊 Testing ${keys.length} selectors...\n`);

    keys.forEach(key => {
      try {
        const el = resolveKey(key);
        const found = !!el;
        
        // Categorize by top-level key
        const category = key.split('.')[0];
        if (!results.byCategory[category]) {
          results.byCategory[category] = { total: 0, found: 0, missing: 0 };
        }
        results.byCategory[category].total++;
        
        if (found) {
          results.found++;
          results.byCategory[category].found++;
          const visible = el.offsetWidth > 0 && el.offsetHeight > 0;
          results.details.push({
            key,
            found: true,
            visible,
            element: el.tagName || el.nodeName || 'unknown',
            category
          });
        } else {
          results.missing++;
          results.byCategory[category].missing++;
          results.details.push({
            key,
            found: false,
            reason: 'Element not found in DOM',
            category
          });
        }
      } catch (error) {
        results.errors++;
        results.details.push({
          key,
          found: false,
          error: error.message || String(error),
          category: key.split('.')[0]
        });
        console.warn(`⚠️  Error testing ${key}:`, error);
      }
    });

    // Print summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📈 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Selectors: ${results.total}`);
    console.log(`✅ Found: ${results.found} (${((results.found / results.total) * 100).toFixed(1)}%)`);
    console.log(`❌ Missing: ${results.missing} (${((results.missing / results.total) * 100).toFixed(1)}%)`);
    console.log(`⚠️  Errors: ${results.errors}`);
    console.log('');

    // Print by category
    console.log('📂 RESULTS BY CATEGORY');
    console.log('───────────────────────────────────────────────────────────');
    Object.keys(results.byCategory).sort().forEach(cat => {
      const catResults = results.byCategory[cat];
      const pct = catResults.total > 0 ? ((catResults.found / catResults.total) * 100).toFixed(1) : 0;
      const status = catResults.found === catResults.total ? '✅' : 
                     catResults.found > 0 ? '⚠️ ' : '❌';
      console.log(`${status} ${cat.padEnd(15)} ${catResults.found}/${catResults.total} (${pct}%)`);
    });
    console.log('');

    // Print missing keys
    if (results.missing > 0) {
      const missing = results.details.filter(r => !r.found && !r.error).map(r => r.key);
      console.log('❌ MISSING SELECTORS:');
      console.log('───────────────────────────────────────────────────────────');
      const missingByCat = {};
      missing.forEach(key => {
        const cat = key.split('.')[0];
        if (!missingByCat[cat]) missingByCat[cat] = [];
        missingByCat[cat].push(key);
      });
      Object.keys(missingByCat).sort().forEach(cat => {
        console.log(`\n${cat}:`);
        missingByCat[cat].forEach(key => console.log(`  - ${key}`));
      });
      console.log('');
    }

    // Print block category details
    console.log('🧩 BLOCK CATEGORY DETAILS');
    console.log('───────────────────────────────────────────────────────────');
    const blockCategories = ['motion', 'looks', 'sound', 'events', 'control', 'sensing', 'operators', 'variables', 'lists'];
    blockCategories.forEach(cat => {
      const blockKeys = keys.filter(k => k.startsWith(`flyout.block.${cat}`));
      if (blockKeys.length > 0) {
        const foundCount = blockKeys.filter(k => {
          const detail = results.details.find(d => d.key === k);
          return detail && detail.found;
        }).length;
        const status = foundCount === blockKeys.length ? '✅' : 
                       foundCount > 0 ? '⚠️ ' : '❌';
        console.log(`${status} ${cat.padEnd(15)} ${foundCount}/${blockKeys.length} blocks found`);
      }
    });
    console.log('');

    // Return results for programmatic access
    window.SELECTOR_MAP_TEST_RESULTS = results;
    console.log('💾 Results saved to window.SELECTOR_MAP_TEST_RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    return results;
  }
})();






