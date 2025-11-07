// Comprehensive tutorial data for cumulative project building
// Each mini lesson builds upon the previous one to create a complete interactive game

const COMPREHENSIVE_TUTORIAL_DATA = {
  "Tutorial Lesson 1": {
    "Project Setup & Motion": [
      {
        id: 1,
        title: "Hi! 👋",
        description: "See the cat? That's your sprite! We'll make it move.",
        infoBox: "Sprites are characters in your game!",
        highlightSelector: "key:sprite.cat",
        pointerText: "Your sprite",
        actions: [],
        requireComplete: false
      },
      {
        id: 2,
        title: "Click Events",
        description: "Click the yellow 'Events' button.",
        infoBox: "Events start your code!",
        highlightSelector: "key:toolbox.category.events",
        pointerText: "Click Events",
        actions: [{ label: "Click Events", clickSelector: "key:toolbox.category.events" }],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:toolbox.category.events" }
      },
      {
        id: 3,
        title: "Get Green Flag",
        description: "Drag 'when green flag clicked' to your workspace.",
        infoBox: "This starts your game!",
        highlightSelector: "key:flyout.block.events.event_whenflagclicked",
        pointerText: "Drag this",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "when green flag" }
      },
      {
        id: 4,
        title: "Click Motion",
        description: "Click the blue 'Motion' button.",
        infoBox: "Motion blocks make things move!",
        highlightSelector: "key:toolbox.category.motion",
        pointerText: "Click Motion",
        actions: [{ label: "Click Motion", clickSelector: "key:toolbox.category.motion" }],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:toolbox.category.motion" }
      },
      {
        id: 5,
        title: "Add Move Block",
        description: "Drag 'move 10 steps' and connect it under the green flag.",
        infoBox: "This makes the cat move!",
        highlightSelector: "key:flyout.block.motion.move_steps",
        pointerText: "Drag move",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "move 10" }
      },
      {
        id: 6,
        title: "Try It! 🚩",
        description: "Click the green flag. Watch the cat move!",
        infoBox: "Great! The cat moved!",
        highlightSelector: "key:ui.green_flag",
        pointerText: "Click flag",
        actions: [{ label: "Click Flag!", clickSelector: "key:ui.green_flag" }],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:ui.green_flag" }
      },
      {
        id: 7,
        title: "Go Back to Events",
        description: "Click the yellow 'Events' button again.",
        infoBox: "We need Events for keyboard controls!",
        highlightSelector: "key:toolbox.category.events",
        pointerText: "Click Events",
        actions: [{ label: "Click Events", clickSelector: "key:toolbox.category.events" }],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:toolbox.category.events" }
      },
      {
        id: 8,
        title: "Add Right Arrow Event",
        description: "Drag 'when right arrow key pressed' to your workspace.",
        infoBox: "This listens for the right arrow key!",
        highlightSelector: "key:flyout.block.events.event_whenkeypressed",
        pointerText: "Drag right arrow",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "when right arrow" }
      },
      {
        id: 9,
        title: "Add Move to Right Arrow",
        description: "Go to Motion. Drag 'move 10 steps' and connect it under the right arrow block.",
        infoBox: "Now right arrow makes cat move!",
        highlightSelector: "key:flyout.block.motion.move_steps",
        pointerText: "Add move",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "move 10" }
      },
      {
        id: 10,
        title: "Add Left Arrow Event",
        description: "Go to Events. Drag 'when left arrow key pressed' to workspace.",
        infoBox: "This listens for left arrow!",
        highlightSelector: "key:flyout.block.events.event_whenkeypressed",
        pointerText: "Drag left arrow",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "when left arrow" }
      },
      {
        id: 11,
        title: "Add Move Left",
        description: "Go to Motion. Drag 'move -10 steps' under the left arrow block.",
        infoBox: "Negative numbers go left!",
        highlightSelector: "key:flyout.block.motion.move_steps",
        pointerText: "Add move -10",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "move -10" }
      },
      {
        id: 12,
        title: "Add Up Arrow Event",
        description: "Go to Events. Drag 'when up arrow key pressed' to workspace.",
        infoBox: "This listens for up arrow!",
        highlightSelector: "key:flyout.block.events.event_whenkeypressed",
        pointerText: "Drag up arrow",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "when up arrow" }
      },
      {
        id: 13,
        title: "Point Up",
        description: "Go to Motion. Drag 'point in direction 90' under up arrow.",
        infoBox: "90 points up!",
        highlightSelector: "key:flyout.block.motion.point_in_direction",
        pointerText: "Add point 90",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "point in direction 90" }
      },
      {
        id: 14,
        title: "Move Up",
        description: "Add 'move 10 steps' under the point block.",
        infoBox: "Now cat moves up!",
        highlightSelector: "key:flyout.block.motion.move_steps",
        pointerText: "Add move",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "move 10" }
      },
      {
        id: 15,
        title: "Add Down Arrow Event",
        description: "Go to Events. Drag 'when down arrow key pressed' to workspace.",
        infoBox: "This listens for down arrow!",
        highlightSelector: "key:flyout.block.events.event_whenkeypressed",
        pointerText: "Drag down arrow",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "when down arrow" }
      },
      {
        id: 16,
        title: "Point Down",
        description: "Go to Motion. Drag 'point in direction -90' under down arrow.",
        infoBox: "-90 points down!",
        highlightSelector: "key:flyout.block.motion.point_in_direction",
        pointerText: "Add point -90",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "point in direction -90" }
      },
      {
        id: 17,
        title: "Move Down",
        description: "Add 'move 10 steps' under the point block.",
        infoBox: "Now cat moves down!",
        highlightSelector: "key:flyout.block.motion.move_steps",
        pointerText: "Add move",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "move 10" }
      },
      {
        id: 18,
        title: "Reset Position",
        description: "Go to Motion. Add 'go to x: 0 y: 0' at the start of green flag script.",
        infoBox: "Puts cat in the middle!",
        highlightSelector: "key:flyout.block.motion.motion_gotoxy",
        pointerText: "Add go to",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "go to x: 0 y: 0" }
      },
      {
        id: 19,
        title: "Add Bounce",
        description: "Add 'if on edge, bounce' to green flag script. Cat stays on screen!",
        infoBox: "Bounce keeps cat visible!",
        highlightSelector: "key:flyout.block.motion.motion_ifonedgebounce",
        pointerText: "Add bounce",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "if on edge" }
      },
      {
        id: 20,
        title: "Test Your Game! 🎮",
        description: "Click the green flag! Press arrow keys to move the cat!",
        infoBox: "Awesome! You made a moving game!",
        highlightSelector: "key:ui.green_flag",
        pointerText: "Test it!",
        actions: [{ label: "Play Game!", clickSelector: "key:ui.green_flag" }],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:ui.green_flag" }
      }
    ],
    
    "Visual Effects & Animation": [
      {
        id: 1,
        title: "Click Looks",
        description: "Click the purple 'Looks' button.",
        infoBox: "Looks blocks change how things look!",
        highlightSelector: "key:toolbox.category.looks",
        pointerText: "Click Looks",
        actions: [{ label: "Click Looks", clickSelector: "key:toolbox.category.looks" }],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:toolbox.category.looks" }
      },
      {
        id: 2,
        title: "Add Say Block",
        description: "Add 'say Hello!' to your right arrow script.",
        infoBox: "Cat talks when moving!",
        highlightSelector: "key:flyout.block.looks.say",
        pointerText: "Add say",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "say Hello" }
      },
      {
        id: 3,
        title: "Add Animation",
        description: "Add 'next costume' to your movement scripts.",
        infoBox: "Makes cat look like it's walking!",
        highlightSelector: "key:flyout.block.looks.looks_nextcostume",
        pointerText: "Add next costume",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "next costume" }
      },
      {
        id: 4,
        title: "Make It Bigger",
        description: "Add 'change size by 10' to up arrow. Cat grows!",
        infoBox: "Size changes make it fun!",
        highlightSelector: "key:flyout.block.looks.looks_changesizeby",
        pointerText: "Add size",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "change size" }
      },
      {
        id: 5,
        title: "Change Color",
        description: "Add 'change color effect by 25' to left arrow.",
        infoBox: "Color changes are cool!",
        highlightSelector: "key:flyout.block.looks.looks_changeeffectby",
        pointerText: "Add color",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "change color" }
      },
      {
        id: 6,
        title: "Reset Effects",
        description: "Add 'clear graphic effects' to green flag script.",
        infoBox: "Starts fresh each time!",
        highlightSelector: "key:flyout.block.looks.looks_cleargraphiceffects",
        pointerText: "Add clear",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "clear graphic" }
      },
      {
        id: 7,
        title: "Test It! 🎨",
        description: "Click flag! Move around and see the cool effects!",
        infoBox: "Your game looks awesome!",
        highlightSelector: "key:ui.green_flag",
        pointerText: "Test it!",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:ui.green_flag" }
      }
    ],
    
    "Sound & Music System": [
      {
        id: 1,
        title: "Click Sound",
        description: "Click the pink 'Sound' button.",
        infoBox: "Sound blocks add music and sounds!",
        highlightSelector: "key:toolbox.category.sound",
        pointerText: "Click Sound",
        actions: [{ label: "Click Sound", clickSelector: "key:toolbox.category.sound" }],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:toolbox.category.sound" }
      },
      {
        id: 2,
        title: "Add Move Sound",
        description: "Add 'play sound pop' to your right arrow script.",
        infoBox: "Sound plays when cat moves!",
        highlightSelector: "key:flyout.block.sound.sound_play",
        pointerText: "Add sound",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "play sound" }
      },
      {
        id: 3,
        title: "Add More Sounds",
        description: "Add sounds to your other arrow keys too!",
        infoBox: "Different sounds for each direction!",
        highlightSelector: "key:flyout.block.sound.sound_play",
        pointerText: "Add sounds",
        actions: [],
        requireComplete: false
      },
      {
        id: 4,
        title: "Add Music",
        description: "Add 'play sound until done' to green flag for background music.",
        infoBox: "Music plays while you play!",
        highlightSelector: "key:flyout.block.sound.sound_playuntildone",
        pointerText: "Add music",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "play sound until done" }
      },
      {
        id: 5,
        title: "Set Volume",
        description: "Add 'set volume to 50%' before the music.",
        infoBox: "50% is not too loud!",
        highlightSelector: "key:flyout.block.sound.sound_setvolumeto",
        pointerText: "Add volume",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "set volume" }
      },
      {
        id: 6,
        title: "Test Sounds! 🔊",
        description: "Click flag and move! Listen to all the sounds!",
        infoBox: "Your game sounds great!",
        highlightSelector: "key:ui.green_flag",
        pointerText: "Test it!",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:ui.green_flag" }
      }
    ],
    
    "Interactive Events": [
      {
        id: 1,
        title: "Click the Cat",
        description: "Add 'when this sprite clicked'. Connect 'say Meow!'",
        infoBox: "Click cat to make it talk!",
        highlightSelector: "key:flyout.block.events.event_whenthisspriteclicked",
        pointerText: "Add click",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "when this sprite clicked" }
      },
      {
        id: 2,
        title: "Press Space",
        description: "Add 'when space key pressed' with 'change color effect by 50'.",
        infoBox: "Space bar changes color!",
        highlightSelector: "key:flyout.block.events.event_whenkeypressed",
        pointerText: "Add space",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "when space key" }
      },
      {
        id: 3,
        title: "Send Message",
        description: "Add 'broadcast message1' to your space key script.",
        infoBox: "Broadcasts send messages!",
        highlightSelector: "key:flyout.block.events.event_broadcast",
        pointerText: "Add broadcast",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "broadcast" }
      },
      {
        id: 4,
        title: "Receive Message",
        description: "Add 'when I receive message1' with 'say Power up!'",
        infoBox: "Cat reacts to messages!",
        highlightSelector: "key:flyout.block.events.event_whenbroadcastreceived",
        pointerText: "Add receive",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "when I receive" }
      },
      {
        id: 5,
        title: "Test It! ⚡",
        description: "Click flag! Click the cat and press space. See what happens!",
        infoBox: "Your game is interactive!",
        highlightSelector: "key:ui.green_flag",
        pointerText: "Test it!",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:ui.green_flag" }
      }
    ],
    
    "Game Logic & Control": [
      {
        id: 1,
        title: "Click Control",
        description: "Click the orange 'Control' button.",
        infoBox: "Control blocks make decisions!",
        highlightSelector: "key:toolbox.category.control",
        pointerText: "Click Control",
        actions: [{ label: "Click Control", clickSelector: "key:toolbox.category.control" }],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:toolbox.category.control" }
      },
      {
        id: 2,
        title: "Add Forever",
        description: "Wrap your movement in 'forever' loop. Keeps checking for keys!",
        infoBox: "Forever keeps code running!",
        highlightSelector: "key:flyout.block.control.control_forever",
        pointerText: "Add forever",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "forever" }
      },
      {
        id: 3,
        title: "Add If-Then",
        description: "Add 'if then'. Check 'key right arrow pressed?'. If yes, move right.",
        infoBox: "If-then makes decisions!",
        highlightSelector: "key:flyout.block.control.control_if",
        pointerText: "Add if",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "if" }
      },
      {
        id: 4,
        title: "Add Wait",
        description: "Add 'wait 0.1 seconds' after moves. Makes it smoother!",
        infoBox: "Wait adds pauses!",
        highlightSelector: "key:flyout.block.control.control_wait",
        pointerText: "Add wait",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "wait" }
      },
      {
        id: 5,
        title: "Add Repeat",
        description: "Add 'repeat 10' around 'move 1 step'. Smooth movement!",
        infoBox: "Repeat does things many times!",
        highlightSelector: "key:flyout.block.control.control_repeat",
        pointerText: "Add repeat",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "repeat" }
      },
      {
        id: 6,
        title: "Test It! 🔄",
        description: "Click flag! Game should feel smooth now!",
        infoBox: "Your game works great!",
        highlightSelector: "key:ui.green_flag",
        pointerText: "Test it!",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:ui.green_flag" }
      }
    ],
    
    "Collision & Detection": [
      {
        id: 1,
        title: "Click Sensing",
        description: "Click the light blue 'Sensing' button.",
        infoBox: "Sensing detects things!",
        highlightSelector: "key:toolbox.category.sensing",
        pointerText: "Click Sensing",
        actions: [{ label: "Click Sensing", clickSelector: "key:toolbox.category.sensing" }],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:toolbox.category.sensing" }
      },
      {
        id: 2,
        title: "Check Edge",
        description: "Add 'if touching edge?' then 'bounce'. Keeps cat on screen!",
        infoBox: "Edge check keeps cat visible!",
        highlightSelector: "key:flyout.block.sensing.sensing_touchingobjectmenu",
        pointerText: "Add edge check",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "touching edge" }
      },
      {
        id: 3,
        title: "Follow Mouse",
        description: "Add 'point towards mouse-pointer' in forever loop.",
        infoBox: "Cat follows your mouse!",
        highlightSelector: "key:flyout.block.motion.motion_pointtowards",
        pointerText: "Add follow",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "point towards" }
      },
      {
        id: 4,
        title: "Check Distance",
        description: "Add 'if distance to mouse-pointer < 50' then 'say Close!'",
        infoBox: "Distance checks how far things are!",
        highlightSelector: "key:flyout.block.sensing.sensing_distanceto",
        pointerText: "Add distance",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "distance to" }
      },
      {
        id: 5,
        title: "Ask Question",
        description: "Add 'ask What's your name? and wait'. Then 'say Hello answer!'",
        infoBox: "Ask gets player input!",
        highlightSelector: "key:flyout.block.sensing.sensing_askandwait",
        pointerText: "Add ask",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "ask" }
      },
      {
        id: 6,
        title: "Test It! 👁️",
        description: "Click flag! Move mouse, check edges, answer question!",
        infoBox: "Your game detects things!",
        highlightSelector: "key:ui.green_flag",
        pointerText: "Test it!",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:ui.green_flag" }
      }
    ],
    
    "Scoring & Calculations": [
      {
        id: 1,
        title: "Click Operators",
        description: "Click the green 'Operators' button.",
        infoBox: "Operators do math!",
        highlightSelector: "key:toolbox.category.operators",
        pointerText: "Click Operators",
        actions: [{ label: "Click Operators", clickSelector: "key:toolbox.category.operators" }],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:toolbox.category.operators" }
      },
      {
        id: 2,
        title: "Add Random",
        description: "Use 'pick random 1 to 20' in 'move steps'. Cat moves different amounts!",
        infoBox: "Random makes it fun!",
        highlightSelector: "key:flyout.block.operators.operators_random",
        pointerText: "Add random",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "pick random" }
      },
      {
        id: 3,
        title: "Add Math",
        description: "Use 'add' to calculate: 'move (10 + 5) steps'.",
        infoBox: "Math calculates numbers!",
        highlightSelector: "key:flyout.block.operators.operators_add",
        pointerText: "Add math",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "add" }
      },
      {
        id: 4,
        title: "Compare Numbers",
        description: "Use 'greater than' to check 'if distance > 50' then do something.",
        infoBox: "Comparisons check if things are bigger or smaller!",
        highlightSelector: "key:flyout.block.operators.operators_gt",
        pointerText: "Add comparison",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "greater than" }
      },
      {
        id: 5,
        title: "Test It! ➕",
        description: "Click flag! See how random and math work!",
        infoBox: "Math makes your game smart!",
        highlightSelector: "key:ui.green_flag",
        pointerText: "Test it!",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:ui.green_flag" }
      }
    ],
    
    "Score System & Data": [
      {
        id: 1,
        title: "Click Variables",
        description: "Click the orange 'Variables' button. Click 'Make a Variable'. Name it 'Score'.",
        infoBox: "Variables remember numbers!",
        highlightSelector: "key:toolbox.category.variables",
        pointerText: "Click Variables",
        actions: [{ label: "Click Variables", clickSelector: "key:toolbox.category.variables" }],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:toolbox.category.variables" }
      },
      {
        id: 2,
        title: "Set Score to 0",
        description: "Add 'set Score to 0' to your green flag script.",
        infoBox: "Starts at zero!",
        highlightSelector: "key:flyout.block.variables.variables_set",
        pointerText: "Set score",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "set Score" }
      },
      {
        id: 3,
        title: "Add Points",
        description: "Add 'change Score by 1' to your movement scripts.",
        infoBox: "Score goes up when you move!",
        highlightSelector: "key:flyout.block.variables.variables_change",
        pointerText: "Change score",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "change Score" }
      },
      {
        id: 4,
        title: "Create Lives",
        description: "Make 'Lives' variable. Set it to 3 in green flag script.",
        infoBox: "Lives are your chances!",
        highlightSelector: null,
        pointerText: "Create Lives",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "set Lives" }
      },
      {
        id: 5,
        title: "Show on Stage",
        description: "Make sure Score and Lives are 'show' so you can see them!",
        infoBox: "Shows your progress!",
        highlightSelector: "key:flyout.block.variables.variables_show",
        pointerText: "Show variables",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "show variable" }
      },
      {
        id: 6,
        title: "Check Score",
        description: "Add 'if Score > 10 then' broadcast 'level up'.",
        infoBox: "Score checks trigger events!",
        highlightSelector: null,
        pointerText: "Check score",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "if Score" }
      },
      {
        id: 7,
        title: "Test Score! 📊",
        description: "Click flag! Move around and watch your score go up!",
        infoBox: "You have a score system!",
        highlightSelector: "key:ui.green_flag",
        pointerText: "Test it!",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:ui.green_flag" }
      }
    ],
    
    "Polish & Complete": [
      {
        id: 1,
        title: "Game Over",
        description: "Add 'if Lives < 1 then' say 'Game Over!' and 'stop all'.",
        infoBox: "Game ends when lives run out!",
        highlightSelector: null,
        pointerText: "Add game over",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "if Lives" }
      },
      {
        id: 2,
        title: "You Win!",
        description: "Add 'if Score > 50 then' say 'You Win!' and play sound.",
        infoBox: "Players need a goal!",
        highlightSelector: null,
        pointerText: "Add win",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "if Score" }
      },
      {
        id: 3,
        title: "Add Levels",
        description: "Create 'Level' variable. Increase when Score hits 20, 40, 60.",
        infoBox: "Levels show progress!",
        highlightSelector: null,
        pointerText: "Add levels",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "set Level" }
      },
      {
        id: 4,
        title: "Welcome Message",
        description: "Add 'say Welcome to My Game!' for 2 seconds at start.",
        infoBox: "Welcome players!",
        highlightSelector: null,
        pointerText: "Add welcome",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "say Welcome" }
      },
      {
        id: 5,
        title: "Add Instructions",
        description: "Add 'say Use arrows to move, space for special!'",
        infoBox: "Tell players how to play!",
        highlightSelector: null,
        pointerText: "Add instructions",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "say Use arrow" }
      },
      {
        id: 6,
        title: "Reset Everything",
        description: "Add 'set size to 100%' and 'go to x: 0 y: 0' at start.",
        infoBox: "Starts fresh each time!",
        highlightSelector: null,
        pointerText: "Reset",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "blocklyText", text: "go to x: 0 y: 0" }
      },
      {
        id: 7,
        title: "You Did It! 🎮",
        description: "Click flag and play your complete game! You made something awesome!",
        infoBox: "You built a complete game!",
        highlightSelector: "key:ui.green_flag",
        pointerText: "Play game!",
        actions: [],
        requireComplete: true,
        completeWhen: { type: "clickSelector", selector: "key:ui.green_flag" }
      }
    ]
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = COMPREHENSIVE_TUTORIAL_DATA;
}

