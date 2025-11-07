# Selector Map Testing Guide

## Overview

This project now includes a comprehensive, hardcoded map of all Scratch 3.0 elements and blocks in `selector-map.json`. The map includes:

- **UI Elements**: Stage, sprites, buttons (green flag, stop, fullscreen, etc.)
- **Toolbox Categories**: All 9 categories (Motion, Looks, Sound, Events, Control, Sensing, Operators, Variables, My Blocks)
- **Blocks**: Complete mapping of all blocks from each category:
  - **Motion**: 17 blocks (move_steps, turn_right, turn_left, go_to_xy, etc.)
  - **Looks**: 18 blocks (say, think, show, hide, switch_costume, etc.)
  - **Sound**: 9 blocks (play_sound, change_volume_by, set_volume_to, etc.)
  - **Events**: 11 blocks (when_flag_clicked, when_key_pressed, broadcast, etc.)
  - **Control**: 11 blocks (wait, repeat, forever, if_then, create_clone, etc.)
  - **Sensing**: 16 blocks (touching, mouse_x, mouse_y, key_pressed, etc.)
  - **Operators**: 30+ blocks (add, subtract, multiply, equals, and, or, not, etc.)
  - **Variables**: 5 blocks (set_variable_to, change_variable_by, etc.)
  - **Lists**: 11 blocks (add_to_list, delete_from_list, item_of_list, etc.)

**Total**: Over 130+ selectors mapped!

## How to Test

### Method 1: Interactive Step-by-Step Test (Recommended) ⭐

This is the best way to visually verify each selector one by one with highlighting!

1. Open a Scratch project editor (https://scratch.mit.edu/projects/editor/)
2. Open the browser console (F12)
3. Run the interactive test:

```javascript
testSelectorsInteractive();
```

**Features:**
- ✅ Visual highlighting of each element
- ✅ Shows all CSS selectors being tested
- ✅ Step-by-step confirmation (✅ Found / ❌ Missing)
- ✅ Navigation (Previous/Next/Skip)
- ✅ Auto-advances after confirmation
- ✅ Shows element details (tag, size, visibility)
- ✅ Scrolls to element automatically
- ✅ Tracks results and shows summary

**Controls:**
- **← Previous**: Go to previous selector
- **✅ Found**: Mark as found and move to next
- **❌ Missing**: Mark as missing and move to next
- **Next →**: Skip without marking
- **Skip**: Move to next selector
- **Skip All Missing**: Jump to next found selector

The test will show a card overlay with:
- Current selector key (e.g., `flyout.block.motion.move_steps`)
- All CSS selectors being tested
- Status (✅ FOUND or ❌ NOT FOUND)
- Element information (tag name, size, visibility)
- A visual highlight box around the element
- A pointer indicator

### Method 2: Automated Test (Quick Summary)

1. Open a Scratch project editor (https://scratch.mit.edu/projects/editor/)
2. Open the browser console (F12)
3. Run:

```javascript
// Test all selectors and get summary
testScratchSelectors();

// Or test a specific selector
testScratchSelector('flyout.block.motion.move_steps');
testScratchSelector('ui.green_flag');
```

### Method 3: Using the Extension API

1. Open the extension popup
2. Open browser console
3. Send a message to test:

```javascript
// Interactive test
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  chrome.tabs.sendMessage(tabs[0].id, {action: 'testSelectorsInteractive'}, function(response) {
    console.log('Interactive test started:', response);
  });
});

// Or automated test
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  chrome.tabs.sendMessage(tabs[0].id, {action: 'testSelectorMap'}, function(response) {
    console.log('Test Results:', response.results);
  });
});
```

### Method 4: Standalone Test Script

1. Open a Scratch editor page
2. Open browser console
3. Load and run the test script:

```javascript
// Copy and paste the contents of test-selector-map.js into the console
// Or inject it as a script tag
```

## Test Output

The test will output:

1. **Summary**: Total selectors, found count, missing count, errors
2. **Results by Category**: Breakdown showing success rate per category
3. **Missing Selectors**: List of selectors that couldn't be found, grouped by category
4. **Block Category Details**: Specific results for each block category

Example output:
```
═══════════════════════════════════════════════════════════
[Selector Test] 📊 SUMMARY
═══════════════════════════════════════════════════════════
Total Selectors: 147
✅ Found: 142 (96.6%)
❌ Missing: 5 (3.4%)
⚠️  Errors: 0

📂 RESULTS BY CATEGORY:
───────────────────────────────────────────────────────────
✅ flyout         142/147 (96.6%)
✅ stage          1/1 (100.0%)
✅ sprite         1/1 (100.0%)
✅ toolbox        9/9 (100.0%)
✅ ui             5/5 (100.0%)
✅ workspace      1/1 (100.0%)

🧩 BLOCK CATEGORY DETAILS:
───────────────────────────────────────────────────────────
✅ motion         17/17 blocks found
✅ looks          18/18 blocks found
✅ sound          9/9 blocks found
✅ events         11/11 blocks found
✅ control        11/11 blocks found
✅ sensing        16/16 blocks found
⚠️  operators     28/30 blocks found
✅ variables      5/5 blocks found
✅ lists          11/11 blocks found
═══════════════════════════════════════════════════════════
```

## Understanding the Map Structure

The selector map uses a hierarchical key structure:

```
stage.main                          → Main stage element
toolbox.category.motion              → Motion category button
flyout.block.motion.move_steps       → "move 10 steps" block
flyout.block.events.event_whenflagclicked → "when green flag clicked" block
ui.green_flag                       → Green flag button
sprite.cat                          → Scratch Cat sprite
```

Each entry can have:
- `css`: Array of CSS selectors to find the element
- `flyoutText`: Text to match when searching for blocks in the flyout
- `domtext`: Text to match in DOM elements
- `text`: Text to match in toolbox categories

## Troubleshooting

### Selectors Not Found

If selectors are not found, it could be because:
1. The Scratch editor hasn't fully loaded - wait a few seconds
2. A category isn't open - blocks are only visible when their category is selected
3. The page structure has changed - Scratch occasionally updates their UI

### Testing Blocks

To test blocks, you may need to:
1. First open the category (e.g., click on "Motion" to see motion blocks)
2. Wait for the flyout to render
3. Then test the block selector

Example:
```javascript
// Open Motion category first
const motionCat = testScratchSelector('toolbox.category.motion');
if (motionCat) {
  motionCat.click();
  setTimeout(() => {
    // Now test the block
    testScratchSelector('flyout.block.motion.move_steps');
  }, 500);
}
```

## Updating the Map

If you find missing or incorrect selectors:

1. Edit `selector-map.json`
2. Add new selectors with multiple CSS fallbacks
3. Re-run the test to verify
4. The map is automatically loaded by `content.js` on page load

## Notes

- The map includes multiple fallback selectors for each element to handle Scratch UI variations
- Block selectors use `data-id` attributes which are stable across Scratch versions
- Some blocks may not be visible until their category is opened
- The test function respects the current state of the Scratch editor

