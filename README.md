# Scratch AI Learning Assistant 🎯

A Chrome extension powered by Google Gemini AI that helps you learn Scratch programming through interactive tutorials, personalized guidance, and intelligent question-answering.

## Features

- **📚 Interactive Introduction**: Get a comprehensive introduction to Scratch programming concepts
- **🎓 Step-by-Step Tutorials**: Follow guided tutorials broken down into digestible steps
- **📄 PDF Tutorial Support**: Upload and follow along with PDF tutorials
- **❓ Ask Questions**: Get instant help with any Scratch-related questions
- **🤖 AI-Powered**: Powered by Google Gemini Pro for intelligent assistance

## Quick Start

**Get up and running in 5 minutes!** See [QUICK_START.md](QUICK_START.md) for a streamlined installation guide.

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the folder containing this extension

## Setup

**Ready to use immediately!** The extension comes with a pre-configured API key for instant learning.

(Advanced users can optionally set their own API key in the extension popup settings.)

## How to Use

### Introduction Tab
- Click "Get Detailed Introduction" to learn the basics of Scratch
- Perfect for complete beginners

### Tutorial Tab
- Start with a general Scratch tutorial, OR
- Upload a PDF tutorial for personalized guidance
- Navigate through steps with Previous/Next buttons

### Ask Question Tab
- Type any question about Scratch programming
- Get instant, detailed answers from the AI assistant

## Project Structure

```
scratch-ai-assistant/
├── manifest.json        # Extension configuration
├── popup.html           # Main UI
├── popup.css            # Styling
├── popup.js             # Main logic
├── background.js        # Background service worker
├── content.js           # Content script
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── .gitignore           # Git ignore file
├── README.md            # This file
├── QUICK_START.md       # 5-minute quick start guide
├── INSTALLATION.md      # Detailed installation guide
├── USAGE.md             # Comprehensive usage guide
└── FEATURES.md          # Feature documentation
```

## Requirements

- Google Chrome (or Chromium-based browser)
- Google Gemini API key (free from Google AI Studio)
- Active internet connection

## Privacy

- Your API key is stored locally in Chrome's storage
- All AI requests go directly to Google's Gemini API
- No data is collected or shared

## License

MIT License - feel free to use and modify as needed!

## Contributing

Feel free to submit issues and enhancement requests!

## Credits

Powered by [Google Gemini Pro](https://deepmind.google/technologies/gemini/)

# CodeCadets
