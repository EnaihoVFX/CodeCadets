// Simple tutorial for very young kids
// Short, simple words and fun activities

const SCRATCH_TUTORIAL_STRUCTURE = {
  tutorialName: "Let's Make the Cat Move!",
  steps: [
    {
      id: 1,
      title: "Hi! 👋",
      description: "See the cat? Click it!",
      infoBox: "",
      highlightSelector: "key:sprite.cat",
      pointerText: "Click the cat",
      actions: [
        {
          label: "👉 Click the Cat",
          clickSelector: "key:sprite.cat"
        }
      ],
      requireComplete: true,
      completeWhen: { type: "clickSelector", selector: "key:sprite.cat" }
    },
    {
      id: 2,
      title: "See the Blocks?",
      description: "Click the blue button that says 'Motion'.",
      infoBox: "",
      highlightSelector: "key:toolbox.category.motion",
      pointerText: "Click Motion",
      actions: [
        {
          label: "Click Motion",
          clickSelector: "key:toolbox.category.motion"
        }
      ],
      requireComplete: true,
      completeWhen: { type: "clickSelector", selector: "key:toolbox.category.motion" }
    },
    {
      id: 3,
      title: "Move Block!",
      description: "Drag the block that says 'move 10 steps' to the middle.",
      infoBox: "",
      highlightSelector: "key:flyout.block.motion.move_steps",
      pointerText: "Drag this",
      actions: [
        {
          label: "Drag Move Block",
          clickSelector: null,
          ghostBlock: {
            type: "motion",
            blockName: "move_steps",
            params: { steps: 10 }
          }
        }
      ],
      requireComplete: true,
      completeWhen: { type: "blocklyText", text: "move 10" }
    },
    {
      id: 4,
      title: "Click Yellow!",
      description: "Click the yellow button that says 'Events'.",
      infoBox: "",
      highlightSelector: "key:toolbox.category.events",
      pointerText: "Click Events",
      actions: [
        {
          label: "Click Events",
          clickSelector: "key:toolbox.category.events"
        }
      ],
      requireComplete: true,
      completeWhen: { type: "clickSelector", selector: "key:toolbox.category.events" }
    },
    {
      id: 5,
      title: "Add Start Block",
      description: "Click on 'when green flag clicked' block in the Events category.",
      infoBox: "",
      highlightSelector: "key:flyout.block.events.event_whenflagclicked",
      pointerText: "Click here",
      actions: [
        {
          label: "Click Start Block",
          clickSelector: "key:flyout.block.events.event_whenflagclicked",
          ghostBlock: {
            type: "events",
            blockName: "event_whenflagclicked",
            position: "top"
          }
        }
      ],
      requireComplete: true,
      completeWhen: { type: "clickSelector", selector: "key:flyout.block.events.event_whenflagclicked" }
    },
    {
      id: 6,
      title: "Click the Flag! 🚩",
      description: "See the green flag? Click it!",
      infoBox: "",
      highlightSelector: "key:ui.green_flag",
      pointerText: "Click here",
      actions: [
        {
          label: "Click Flag!",
          clickSelector: "key:ui.green_flag"
        }
      ],
      requireComplete: true,
      completeWhen: { type: "clickSelector", selector: "key:ui.green_flag" }
    },
    {
      id: 7,
      title: "Yay! 🎉",
      description: "Did the cat move? You did it!",
      infoBox: "",
      highlightSelector: "key:ui.green_flag",
      pointerText: "Click again",
      actions: [
        {
          label: "Click Flag Again",
          clickSelector: "key:ui.green_flag"
        }
      ],
      requireComplete: false
    },
    {
      id: 8,
      title: "Make It Talk!",
      description: "Click the purple button that says 'Looks'.",
      infoBox: "",
      highlightSelector: "key:toolbox.category.looks",
      pointerText: "Click Looks",
      actions: [
        {
          label: "Click Looks",
          clickSelector: "key:toolbox.category.looks"
        }
      ],
      requireComplete: true,
      completeWhen: { type: "clickSelector", selector: "key:toolbox.category.looks" }
    },
    {
      id: 9,
      title: "Say Hello!",
      description: "Drag 'say Hello!' below your move block.",
      infoBox: "",
      highlightSelector: "key:flyout.block.looks.say",
      pointerText: "Drag here",
      actions: [
        {
          label: "Add Say Block",
          clickSelector: null,
          ghostBlock: {
            type: "looks",
            blockName: "say",
            params: { text: "Hello!" }
          }
        }
      ],
      requireComplete: true,
      completeWhen: { type: "blocklyText", text: "say Hello" }
    },
    {
      id: 10,
      title: "Try It!",
      description: "Click the green flag!",
      infoBox: "",
      highlightSelector: "key:ui.green_flag",
      pointerText: "Click flag",
      actions: [
        {
          label: "Click Flag!",
          clickSelector: "key:ui.green_flag"
        }
      ],
      requireComplete: true,
      completeWhen: { type: "clickSelector", selector: "key:ui.green_flag" }
    },
    {
      id: 11,
      title: "You're Awesome! ⭐",
      description: "The cat moved and talked! You made a program!",
      infoBox: "",
      highlightSelector: null,
      actions: []
    }
  ]
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SCRATCH_TUTORIAL_STRUCTURE;
}
