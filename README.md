# CodeCadets Extension 🎯

A Chrome extension that helps you learn Scratch programming through interactive tutorials, gamification, achievements, and AI-powered assistance.

## Features

- **📚 Interactive Tutorials**: Step-by-step guided tutorials for Scratch programming
- **🎮 Gamification**: XP system, levels, achievements, and progress tracking
- **👤 User Profiles**: Customizable avatars and profile pages
- **🏆 Achievements**: Unlock badges and track your learning progress
- **🤖 AI-Powered**: Get help with Scratch-related questions
- **☁️ Cloud Sync**: Sync your progress across devices with Supabase

## Quick Start

### Installation (2 minutes)

1. **Open Chrome Extensions**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

2. **Load Extension**
   - Click "Load unpacked"
   - Select this folder

3. **Done!** 🎉 The extension is ready to use!

**Note:** The extension comes with a pre-configured API key, so you can start learning immediately!

## How to Use

### Main Interface

- **Tutorials**: Browse and start interactive Scratch tutorials
- **Achievements**: View your unlocked badges and progress
- **Profile**: Customize your avatar and view your stats
- **Shop**: Coming soon!

### Profile Page

- Click the profile icon in the extension popup
- Customize your character avatar
- View your XP, level, and achievements
- Sync your data to the cloud (requires Supabase setup)

### Tutorials

1. Click on any tutorial card
2. Follow the step-by-step instructions
3. Complete steps to earn XP and achievements
4. Track your progress

## Setup (Optional)

### Supabase Cloud Sync

To sync your progress across devices:

1. **Get Your Supabase API Key**
   - See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed instructions
   - You'll need your Supabase project URL and anon key

2. **Configure Extension**
   - Open `config/supabase-config.js`
   - Replace `YOUR-ANON-KEY-HERE` with your actual key
   - Update the project URL if needed

3. **Create Database Table**
   - Run the SQL from `sql/CREATE_TABLE.sql` in your Supabase SQL Editor
   - Or follow the setup guide in `SUPABASE_SETUP.md`

4. **Test**
   - Reload the extension
   - Open Profile page
   - Click SYNC button

## Project Structure

```
codecadets/
├── manifest.json              # Extension configuration
├── pages/                     # HTML pages
│   ├── popup.html            # Main popup UI
│   ├── profile.html          # Profile page
│   ├── game-maker.html       # Game maker page
│   └── congratulations-screen.html
├── scripts/                   # JavaScript files
│   ├── core/                 # Core extension scripts
│   │   ├── background.js     # Service worker
│   │   └── content.js        # Content script for Scratch
│   ├── services/             # Service modules
│   │   ├── database-service.js
│   │   └── learnworlds-user.js
│   ├── avatar/               # Avatar system
│   │   ├── avatar-customizer.js
│   │   ├── avatar-utils.js
│   │   ├── character-builder.js
│   │   └── lpc-integration.js
│   ├── pages/                 # Page-specific scripts
│   │   ├── popup.js
│   │   └── profile.js
│   └── data/                  # Data files
│       ├── tutorial-data.js
│       ├── comprehensive-tutorial-data.js
│       └── selector-map.js
├── styles/                    # CSS files
│   ├── popup.css
│   └── popup-layout.css
├── config/                    # Configuration files
│   ├── supabase-config.js
│   └── supabase-config.example.js
├── data/                      # Data files
│   └── selector-map.json
├── sql/                       # SQL scripts
│   └── CREATE_TABLE.sql
├── images/                    # Images and logos
│   ├── logo.png
│   ├── mascot.png
│   └── star-badge.svg
├── assets/                    # Character assets
│   └── lpc/                   # LPC sprite assets
├── icons/                     # Extension icons
├── iconpack/                  # Icon pack
├── vendor/                    # Third-party libraries
└── SUPABASE_SETUP.md          # Supabase setup guide
```

## Requirements

- Google Chrome (or Chromium-based browser)
- Active internet connection (for AI features and cloud sync)

## Privacy

- Your data is stored locally in Chrome's storage
- Cloud sync is optional and uses your own Supabase instance
- No data is collected or shared with third parties
- API keys are stored locally

## Troubleshooting

### Extension Not Loading
- Make sure Developer mode is enabled
- Check browser console for errors
- Verify all files are in the correct folder

### Sync Not Working
- Check your Supabase credentials in `supabase-config.js`
- Verify the database table exists (see `SUPABASE_SETUP.md`)
- Check browser console for error messages
- Ensure you're using the **anon/public** key, not the service_role key

### Avatar Not Showing
- Make sure you've created and saved an avatar in the Profile page
- Check browser console for errors
- Try reloading the extension

## Development

### Testing

See [TESTING.md](TESTING.md) for testing guidelines and procedures.

### Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use and modify as needed!

## Credits

- Character assets from [Universal LPC Spritesheet](https://github.com/makrohn/Universal-LPC-spritesheet)
- Powered by Google Gemini AI

---

**Happy Learning!** 🎉
