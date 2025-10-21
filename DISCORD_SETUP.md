# Discord Rich Presence Setup Guide

## 🎮 Interactive Settings Interface

Your GeForce NOW Electron app now includes a beautiful, interactive settings interface for configuring Discord Rich Presence!

## 🚀 How to Access Settings

### Method 1: Keyboard Shortcut

- Press **`Ctrl+,`** (or **`Cmd+,`** on Mac) while the app is running

### Method 2: Right-Click Menu

- Right-click anywhere in the GeForce NOW interface
- Select **"Settings"** from the context menu

### Method 3: Menu Bar (if enabled)

- Look for settings options in the application menu

## ⚙️ Discord Client ID Configuration

### Step 1: Get Your Discord Application Client ID

1. **Go to Discord Developer Portal**

   - Visit: https://discord.com/developers/applications
   - Log in with your Discord account

2. **Create a New Application**

   - Click **"New Application"**
   - Give it a name like "GeForce NOW" or "My Gaming Status"
   - Click **"Create"**

3. **Copy the Application ID**
   - In the **"General Information"** tab
   - Copy the **"Application ID"** (this is your Client ID)
   - It should be 17-19 digits long

### Step 2: Configure in GeForce NOW

1. **Open Settings**

   - Use `Ctrl+,` or right-click → Settings

2. **Enter Your Client ID**

   - Paste the Application ID in the "Discord Application Client ID" field
   - Click **"Save Settings"**

3. **Test Connection**

   - Click **"Test Connection"** to verify it works
   - You should see "Discord Client ID is valid and ready to use!"

4. **Restart the App**
   - Close and restart GeForce NOW for changes to take effect

## 🎯 What This Does

Once configured, your Discord status will show:

- ✅ **Current game name** (e.g., "Cyberpunk 2077 on GeForce NOW")
- ✅ **Game artwork** (Steam game images when available)
- ✅ **"Not affiliated with NVIDIA"** disclaimer
- ✅ **Start time** of your gaming session

## 🔧 Settings Interface Features

### Real-Time Status

- **Discord Status**: Shows if Discord is running
- **Current Client ID**: Displays your configured Client ID
- **Connection Test**: Validates your Client ID format

### User-Friendly Design

- **Dark Theme**: Matches GeForce NOW's aesthetic
- **Step-by-Step Instructions**: Built-in guide for getting Client ID
- **Input Validation**: Ensures correct Client ID format
- **Error Handling**: Clear error messages and success feedback

## 🎮 Usage Tips

### For Best Results:

1. **Keep Discord Running**: Make sure Discord is open before starting games
2. **Use Steam Games**: Games with Steam versions get better artwork
3. **Check Status**: Use the settings to verify Discord is detected
4. **Test First**: Always test your Client ID before gaming

### Troubleshooting:

- **Discord Not Detected**: Make sure Discord is running and restart the app
- **No Game Artwork**: Some games may not have Steam artwork available
- **Status Not Updating**: Try restarting both Discord and GeForce NOW

## 🔄 Settings Priority

The app checks for Discord Client ID in this order:

1. **Settings File** (your interactive configuration) ← **Primary**
2. Environment variable (`DISCORD_CLIENT_ID`)
3. Local config file (`scripts/local-config.js`)
4. Default placeholder

## 📁 Settings Storage

Your settings are saved to:

- **Linux**: `~/.config/GeForce NOW/settings.json`
- **Windows**: `%APPDATA%/GeForce NOW/settings.json`
- **macOS**: `~/Library/Application Support/GeForce NOW/settings.json`

## 🎉 Enjoy Your Enhanced Gaming Experience!

Now you can easily configure Discord Rich Presence without editing any code files. Your friends will see exactly what you're playing on GeForce NOW!

---

**Need Help?** The settings interface includes built-in instructions and validation to guide you through the process.
