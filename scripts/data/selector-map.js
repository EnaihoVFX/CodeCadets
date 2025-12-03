// Global selector map for Scratch editor targets
// Structured nested keys so AI can reference stable ids like:
//   stage.main, toolbox.category.motion, flyout.block.motion.move_steps, sprite.cat, ui.green_flag
// This is a minimal fallback - the full map is loaded from selector-map.json
(function(){
  const SELECTOR_MAP = {
    stage: {
      main: {
        css: [
          "[aria-label='Stage']",
          ".stage",
          ".stage-wrapper",
          "[class*='stage'] canvas",
          "canvas[class*='stage']",
          "canvas"
        ]
      }
    },
    sprite: {
      cat: {
        css: [
          "[aria-label='Sprite1']",
          "[aria-label*='Scratch Cat']",
          ".sprite-selector-item[aria-label*='Sprite']",
          ".sprite-list-item[aria-label*='Sprite']"
        ],
        domtext: ["Scratch Cat", "Sprite1"]
      }
    },
    toolbox: {
      category: {
        motion: {
          css: [
            ".scratchCategoryMenuItem.scratchCategoryId-motion",
            "[aria-label='Motion']",
            "[data-category='motion']",
            ".blocklyToolboxCategory[aria-label='Motion']",
            ".blocklyToolboxItem[aria-label='Motion']",
            ".blocklyTreeRow[aria-label='Motion']"
          ],
          text: ["Motion"]
        },
        looks: {
          css: [
            ".scratchCategoryMenuItem.scratchCategoryId-looks",
            "[aria-label='Looks']",
            "[data-category='looks']",
            ".blocklyToolboxCategory[aria-label='Looks']",
            ".blocklyToolboxItem[aria-label='Looks']",
            ".blocklyTreeRow[aria-label='Looks']"
          ],
          text: ["Looks"]
        },
        sound: {
          css: [
            ".scratchCategoryMenuItem.scratchCategoryId-sound",
            "[aria-label='Sound']",
            "[data-category='sound']",
            ".blocklyToolboxCategory[aria-label='Sound']",
            ".blocklyToolboxItem[aria-label='Sound']",
            ".blocklyTreeRow[aria-label='Sound']"
          ],
          text: ["Sound"]
        },
        events: {
          css: [
            ".scratchCategoryMenuItem.scratchCategoryId-events",
            "[aria-label='Events']",
            "[data-category='events']",
            ".blocklyToolboxCategory[aria-label='Events']",
            ".blocklyToolboxItem[aria-label='Events']",
            ".blocklyTreeRow[aria-label='Events']"
          ],
          text: ["Events"]
        },
        control: {
          css: [
            ".scratchCategoryMenuItem.scratchCategoryId-control",
            "[aria-label='Control']",
            "[data-category='control']",
            ".blocklyToolboxCategory[aria-label='Control']",
            ".blocklyToolboxItem[aria-label='Control']",
            ".blocklyTreeRow[aria-label='Control']"
          ],
          text: ["Control"]
        },
        sensing: {
          css: [
            ".scratchCategoryMenuItem.scratchCategoryId-sensing",
            "[aria-label='Sensing']",
            "[data-category='sensing']",
            ".blocklyToolboxCategory[aria-label='Sensing']",
            ".blocklyToolboxItem[aria-label='Sensing']",
            ".blocklyTreeRow[aria-label='Sensing']"
          ],
          text: ["Sensing"]
        },
        operators: {
          css: [
            ".scratchCategoryMenuItem.scratchCategoryId-operators",
            "[aria-label='Operators']",
            "[data-category='operators']",
            ".blocklyToolboxCategory[aria-label='Operators']",
            ".blocklyToolboxItem[aria-label='Operators']",
            ".blocklyTreeRow[aria-label='Operators']"
          ],
          text: ["Operators"]
        },
        variables: {
          css: [
            ".scratchCategoryMenuItem.scratchCategoryId-variables",
            "[aria-label='Variables']",
            "[data-category='variables']",
            ".blocklyToolboxCategory[aria-label='Variables']",
            ".blocklyToolboxItem[aria-label='Variables']",
            ".blocklyTreeRow[aria-label='Variables']"
          ],
          text: ["Variables"]
        },
        myBlocks: {
          css: [
            ".scratchCategoryMenuItem.scratchCategoryId-myBlocks",
            "[aria-label='My Blocks']",
            "[data-category='myBlocks']",
            ".blocklyToolboxCategory[aria-label='My Blocks']",
            ".blocklyToolboxItem[aria-label='My Blocks']",
            ".blocklyTreeRow[aria-label='My Blocks']"
          ],
          text: ["My Blocks"]
        }
      },
      flyout: {
        canvas: {
          css: [
            ".blocklyFlyout .blocklyBlockCanvas",
            ".blocklyFlyout canvas",
            ".blocklyFlyout svg"
          ]
        }
      }
    },
    flyout: {
      block: {
        motion: {
          move_steps: {
            css: [
              "g[data-id='motion_movesteps']",
              "g[data-id*='motion_movesteps']"
            ],
            flyoutText: "move 10 steps"
          },
          turn_right: {
            css: [
              "g[data-id='motion_turnright']",
              "g[data-id*='motion_turnright']"
            ],
            flyoutText: "turn 15 degrees"
          },
          turn_left: {
            css: [
              "g[data-id='motion_turnleft']",
              "g[data-id*='motion_turnleft']"
            ],
            flyoutText: "turn 15 degrees"
          }
        },
        events: {
          event_whenflagclicked: {
            css: [
              "g[data-id='event_whenflagclicked']",
              "g[data-id*='event_whenflagclicked']"
            ],
            flyoutText: "when green flag clicked"
          },
          when_green_flag_clicked: {
            css: [
              "g[data-id='event_whenflagclicked']",
              "g[data-id*='event_whenflagclicked']"
            ],
            flyoutText: "when green flag clicked"
          }
        }
      }
    },
    workspace: {
      canvas: {
        css: [
          ".blocklyBlockCanvas",
          ".blocklyWorkspace canvas",
          ".blocklyMainBackground"
        ]
      }
    },
    ui: {
      green_flag: {
        css: [
          ".green-flag",
          ".stage-header_green-flag",
          "button[title*='Go']",
          "button[aria-label*='Go']",
          "button[aria-label*='Start']"
        ],
        domtext: ["Go"]
      },
      stop: {
        css: [
          ".stop-all",
          "button[title*='Stop']",
          "button[aria-label*='Stop']"
        ]
      }
    }
  };
  try { window.SELECTOR_MAP = SELECTOR_MAP; } catch(_) {}
})();





