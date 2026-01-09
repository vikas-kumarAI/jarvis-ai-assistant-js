const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Disable hardware acceleration for compatibility
app.disableHardwareAcceleration();

let mainWindow;

// 🧠 Gemini AI Configuration
const AI_CONFIG = {
    enabled: true,
    provider: 'gemini',
    geminiApiKey: 'AIzaSyATlbeXJxSOScHa2kLrUygy_iENNZ1-4Ro',
    model: 'gemini-pro',
    temperature: 0.7,
    maxTokens: 1000
};

// 🛠️ Enhanced System Commands
class SystemCommands {
    constructor() {
        this.platform = os.platform();
    }

    // 🔒 Lock Screen - FIXED
    async lockScreen() {
        return new Promise((resolve, reject) => {
            let command;
            
            switch (this.platform) {
                case 'win32':
                    command = 'rundll32.exe user32.dll,LockWorkStation';
                    break;
                case 'darwin':
                    command = 'pmset displaysleepnow';
                    break;
                case 'linux':
                    command = 'gnome-screensaver-command -l 2>/dev/null || dm-tool lock 2>/dev/null || loginctl lock-session';
                    break;
                default:
                    reject(new Error(`Unsupported platform: ${this.platform}`));
                    return;
            }

            console.log(`🔒 Lock screen command: ${command}`);
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('Lock screen error:', error);
                    // Try alternative methods
                    this.lockScreenFallback().then(resolve).catch(reject);
                } else {
                    console.log('✅ Lock screen command executed');
                    resolve(true);
                }
            });
        });
    }

    async lockScreenFallback() {
        return new Promise((resolve, reject) => {
            if (this.platform === 'win32') {
                // Alternative Windows method
                const script = `
                    Add-Type -AssemblyName System.Windows.Forms
                    [System.Windows.Forms.SendKeys]::SendWait('{LWIN down}{L down}{LWIN up}{L up}')
                `;
                exec(`powershell -Command "${script}"`, (error) => {
                    if (error) reject(error);
                    else resolve(true);
                });
            } else {
                reject(new Error('Lock screen fallback not available'));
            }
        });
    }

    // 🖥️ Shutdown Computer
    async shutdown() {
        return new Promise((resolve, reject) => {
            let command;
            
            switch (this.platform) {
                case 'win32':
                    command = 'shutdown /s /t 5';
                    break;
                case 'darwin':
                    command = 'osascript -e "tell app \\"System Events\\" to shut down"';
                    break;
                case 'linux':
                    command = 'shutdown -h now';
                    break;
                default:
                    reject(new Error(`Unsupported platform: ${this.platform}`));
                    return;
            }

            exec(command, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    }

    // 🔄 Restart Computer - FIXED
    async restart() {
        return new Promise((resolve, reject) => {
            let command;
            
            switch (this.platform) {
                case 'win32':
                    command = 'shutdown /r /t 5';
                    break;
                case 'darwin':
                    command = 'osascript -e "tell app \\"System Events\\" to restart"';
                    break;
                case 'linux':
                    command = 'shutdown -r now';
                    break;
                default:
                    reject(new Error(`Unsupported platform: ${this.platform}`));
                    return;
            }

            console.log(`🔄 Restart command: ${command}`);
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('Restart error:', error);
                    // Try fallback methods
                    this.restartFallback().then(resolve).catch(reject);
                } else {
                    console.log('✅ Restart command executed');
                    resolve(true);
                }
            });
        });
    }

    async restartFallback() {
        return new Promise((resolve, reject) => {
            if (this.platform === 'win32') {
                const fallbackCommands = [
                    'wmic os where primary=true call reboot',
                    'shutdown /r /f /t 0',
                    'powershell -Command "Restart-Computer -Force"'
                ];

                let currentIndex = 0;

                const tryNextCommand = () => {
                    if (currentIndex >= fallbackCommands.length) {
                        reject(new Error('All restart methods failed. Run as Administrator.'));
                        return;
                    }

                    exec(fallbackCommands[currentIndex], (error) => {
                        if (error) {
                            console.log(`Fallback ${currentIndex + 1} failed`);
                            currentIndex++;
                            tryNextCommand();
                        } else {
                            resolve(true);
                        }
                    });
                };

                tryNextCommand();
            } else {
                reject(new Error('Restart fallback not available'));
            }
        });
    }

    // 🔊 Volume Control
    async setVolume(action) {
        return new Promise((resolve, reject) => {
            let command;
            
            switch (this.platform) {
                case 'win32':
                    if (action === 'up') {
                        command = 'nircmd.exe changesysvolume 2000';
                    } else if (action === 'down') {
                        command = 'nircmd.exe changesysvolume -2000';
                    } else if (action === 'mute') {
                        command = 'nircmd.exe mutesysvolume 2';
                    } else if (action === 'unmute') {
                        command = 'nircmd.exe mutesysvolume 1';
                    }
                    break;
                case 'darwin':
                    if (action === 'up') {
                        command = 'osascript -e "set Volume output volume (output volume of (get volume settings) + 10)"';
                    } else if (action === 'down') {
                        command = 'osascript -e "set Volume output volume (output volume of (get volume settings) - 10)"';
                    } else if (action === 'mute') {
                        command = 'osascript -e "set volume output muted true"';
                    } else if (action === 'unmute') {
                        command = 'osascript -e "set volume output muted false"';
                    }
                    break;
                case 'linux':
                    if (action === 'up') {
                        command = 'amixer -D pulse sset Master 5%+';
                    } else if (action === 'down') {
                        command = 'amixer -D pulse sset Master 5%-';
                    } else if (action === 'mute') {
                        command = 'amixer -D pulse sset Master toggle';
                    } else if (action === 'unmute') {
                        command = 'amixer -D pulse sset Master toggle';
                    }
                    break;
            }

            if (!command) {
                reject(new Error('Invalid volume action'));
                return;
            }

            exec(command, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    }

    // 📸 Take Screenshot
    async takeScreenshot() {
        return new Promise((resolve, reject) => {
            let command;
            const timestamp = new Date().getTime();
            const desktopPath = require('os').homedir() + '/Desktop';
            
            switch (this.platform) {
                case 'win32':
                    // Windows - uses Snipping Tool
                    command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{PRTSC}')"`;
                    break;
                case 'darwin':
                    command = `screencapture -x "${desktopPath}/screenshot_${timestamp}.png"`;
                    break;
                case 'linux':
                    command = `gnome-screenshot -f "${desktopPath}/screenshot_${timestamp}.png"`;
                    break;
                default:
                    reject(new Error(`Unsupported platform: ${this.platform}`));
                    return;
            }

            exec(command, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    }

    // 🎵 Media Control
    async mediaControl(action) {
        return new Promise((resolve, reject) => {
            let command;
            
            switch (this.platform) {
                case 'win32':
                    if (action === 'play') {
                        command = 'nircmd.exe sendkeypress 0xB3';
                    } else if (action === 'pause') {
                        command = 'nircmd.exe sendkeypress 0xB3';
                    } else if (action === 'next') {
                        command = 'nircmd.exe sendkeypress 0xB0';
                    } else if (action === 'previous') {
                        command = 'nircmd.exe sendkeypress 0xB1';
                    }
                    break;
                case 'darwin':
                    if (action === 'play') {
                        command = 'osascript -e "tell application \\"Spotify\\" to play"';
                    } else if (action === 'pause') {
                        command = 'osascript -e "tell application \\"Spotify\\" to pause"';
                    } else if (action === 'next') {
                        command = 'osascript -e "tell application \\"Spotify\\" to next track"';
                    } else if (action === 'previous') {
                        command = 'osascript -e "tell application \\"Spotify\\" to previous track"';
                    }
                    break;
                case 'linux':
                    command = `playerctl ${action}`;
                    break;
            }

            if (!command) {
                reject(new Error('Invalid media action'));
                return;
            }

            exec(command, (error) => {
                if (error) {
                    this.mediaControlFallback(action).then(resolve).catch(reject);
                } else {
                    resolve(true);
                }
            });
        });
    }

    async mediaControlFallback(action) {
        return new Promise((resolve, reject) => {
            if (this.platform === 'win32') {
                const keyCodes = {
                    'play': 'playpause',
                    'pause': 'playpause',
                    'next': 'nexttrack',
                    'previous': 'prevtrack'
                };

                const key = keyCodes[action];
                if (key) {
                    const script = `
                        Add-Type -AssemblyName System.Windows.Forms
                        [System.Windows.Forms.SendKeys]::SendWait('{${key}}')
                    `;
                    exec(`powershell -Command "${script}"`, (error) => {
                        if (error) reject(error);
                        else resolve(true);
                    });
                } else {
                    reject(new Error('Unsupported media action'));
                }
            } else {
                reject(new Error('Media control fallback not available'));
            }
        });
    }

    // 💻 System Information
    async getSystemInfo() {
        return {
            platform: this.platform,
            arch: os.arch(),
            cpus: os.cpus().length,
            totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
            freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
            uptime: Math.round(os.uptime() / 3600) + ' hours',
            userInfo: os.userInfo().username
        };
    }

    // 📁 Open File/Folder
    async openPath(path) {
        return new Promise((resolve, reject) => {
            shell.openPath(path).then(error => {
                if (error) reject(new Error(error));
                else resolve(true);
            });
        });
    }

    // 🌐 Open URL
    async openURL(url) {
        return new Promise((resolve, reject) => {
            shell.openExternal(url).then(() => {
                resolve(true);
            }).catch(reject);
        });
    }

    // 🔍 Search Web
    async searchWeb(query) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        return this.openURL(searchUrl);
    }
}

const systemCommands = new SystemCommands();

// 🧠 Advanced AI System
class AdvancedAI {
    constructor() {
        this.commandHistory = [];
        this.conversationContext = [];
        this.geminiAI = null;
        this.initializeGemini();
    }

    initializeGemini() {
        try {
            this.geminiAI = new GoogleGenerativeAI(AI_CONFIG.geminiApiKey);
            console.log('✅ Gemini AI initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Gemini AI:', error);
        }
    }

    async processCommand(command) {
        console.log(`🧠 AI Processing: "${command}"`);
        
        // Add to command history
        this.commandHistory.push({
            command: command,
            timestamp: new Date().toISOString()
        });
        if (this.commandHistory.length > 20) this.commandHistory.shift();

        // Enhanced system command detection
        const systemCommand = this.detectSystemCommand(command);
        if (systemCommand.shouldExecute) {
            return systemCommand;
        }

        // Use Gemini AI for intelligent responses
        try {
            const aiResponse = await this.getGeminiResponse(command);
            return {
                shouldExecute: false,
                response: aiResponse,
                isAI: true,
                type: 'ai_response'
            };
        } catch (error) {
            console.error('AI Error:', error);
            return {
                shouldExecute: false,
                response: this.getSmartFallback(command),
                isAI: true,
                type: 'fallback'
            };
        }
    }

    detectSystemCommand(command) {
        const lowerCommand = command.toLowerCase().trim();
        
        // Enhanced command patterns
        const patterns = {
            // Lock commands
            lock: /^(lock|lock screen|lock computer|lock system|secure computer)$/i,
            
            // Shutdown commands  
            shutdown: /^(shutdown|turn off|power off|shut down)(?:\s+(?:the\s+)?computer)?$/i,
            
            // Restart commands
            restart: /^(restart|reboot|restart computer|reboot system)(?:\s+(?:the\s+)?computer)?$/i,
            
            // Volume commands
            volumeUp: /^(volume up|increase volume|turn up volume|louder|volume increase)$/i,
            volumeDown: /^(volume down|decrease volume|turn down volume|quieter|volume decrease)$/i,
            mute: /^(mute|mute volume|silence|turn off volume)$/i,
            unmute: /^(unmute|unmute volume|turn on volume)$/i,
            
            // Media commands
            play: /^(play|play music|start music|resume music)$/i,
            pause: /^(pause|pause music|stop music)$/i,
            next: /^(next|next track|next song|skip)$/i,
            previous: /^(previous|previous track|last song|go back)$/i,
            
            // Screenshot
            screenshot: /^(screenshot|take screenshot|capture screen|screen capture)$/i,
            
            // System info
            systemInfo: /^(system info|system information|computer info|show system)$/i,
            
            // Application control
            openApp: /^(?:open|launch|start)\s+(?:the\s+)?(.+)$/i,
            
            // Web and search
            search: /^(?:search|find|look up|google)\s+(?:for\s+)?(.+)$/i,
            website: /^(?:open|visit|go to)\s+(?:the\s+)?(?:website\s+)?(.+)$/i,

            // File operations
            openFile: /^(?:open file|show file|view file)\s+(.+)$/i,
            openFolder: /^(?:open folder|show folder|view folder)\s+(.+)$/i
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const match = command.match(pattern);
            if (match) {
                return {
                    shouldExecute: true,
                    type: type,
                    match: match,
                    command: command,
                    parameters: match[1] || ''
                };
            }
        }

        return { shouldExecute: false };
    }

    async getGeminiResponse(command) {
        if (!this.geminiAI) {
            throw new Error('Gemini AI not initialized');
        }

        try {
            const model = this.geminiAI.getGenerativeModel({ 
                model: AI_CONFIG.model,
                generationConfig: {
                    temperature: AI_CONFIG.temperature,
                    maxOutputTokens: AI_CONFIG.maxTokens,
                    topP: 0.8,
                    topK: 40
                }
            });

            const prompt = this.buildPrompt(command);
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().trim();

            // Clean up the response
            text = text.replace(/^\*+|\*+$/g, '').trim();
            
            return text;
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw new Error(`AI service error: ${error.message}`);
        }
    }

    buildPrompt(command) {
        const time = new Date().toLocaleTimeString();
        const date = new Date().toLocaleDateString();
        const platform = os.platform();
        const username = os.userInfo().username;

        return `You are JARVIS (Just A Rather Very Intelligent System), an advanced AI assistant. Be helpful, concise, and have a slightly witty personality.

Current Context:
- Time: ${time}
- Date: ${date} 
- Platform: ${platform}
- User: ${username}

Keep responses under 2-3 sentences. Be helpful but not overly verbose.

User Command: "${command}"

JARVIS Response:`;
    }

    getSmartFallback(command) {
        const fallbacks = [
            `"${command}" - Understood. I can help with system controls, applications, web search, or answer questions.`,
            `Command processed: "${command}". I'm ready to assist with computer operations or information.`,
            `"${command}" - Acknowledged. How can I help you with this?`
        ];
        
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

const advancedAI = new AdvancedAI();

// 🎯 Enhanced Command Execution
async function executeSystemCommand(commandData, callback) {
    const { type, match, command, parameters } = commandData;
    
    console.log(`⚡ Executing system command: ${type}`);

    try {
        switch (type) {
            case 'lock':
                await systemCommands.lockScreen();
                callback({
                    success: true,
                    output: '🔒 Locking your computer screen...',
                    isAI: false
                });
                break;
                
            case 'shutdown':
                const shutdownResult = await dialog.showMessageBox(mainWindow, {
                    type: 'warning',
                    title: 'Confirm Shutdown',
                    message: 'Are you sure you want to shutdown the computer?',
                    detail: 'All unsaved work will be lost.',
                    buttons: ['Cancel', 'Shutdown'],
                    defaultId: 0,
                    cancelId: 0
                });
                
                if (shutdownResult.response === 1) {
                    await systemCommands.shutdown();
                    callback({
                        success: true,
                        output: '🔄 Computer will shutdown in 5 seconds...',
                        isAI: false
                    });
                } else {
                    callback({
                        success: false,
                        output: 'Shutdown cancelled.',
                        isAI: false
                    });
                }
                break;
                
            case 'restart':
                const restartResult = await dialog.showMessageBox(mainWindow, {
                    type: 'warning',
                    title: 'Confirm Restart',
                    message: 'Are you sure you want to restart the computer?',
                    detail: 'All unsaved work will be lost. Computer will restart in 5 seconds.',
                    buttons: ['Cancel', 'Restart'],
                    defaultId: 0,
                    cancelId: 0
                });
                
                if (restartResult.response === 1) {
                    await systemCommands.restart();
                    callback({
                        success: true,
                        output: '🔄 Computer will restart in 5 seconds... Save your work immediately!',
                        isAI: false
                    });
                } else {
                    callback({
                        success: false,
                        output: 'Restart cancelled.',
                        isAI: false
                    });
                }
                break;
                
            case 'volumeUp':
                await systemCommands.setVolume('up');
                callback({
                    success: true,
                    output: '🔊 Volume increased',
                    isAI: false
                });
                break;
                
            case 'volumeDown':
                await systemCommands.setVolume('down');
                callback({
                    success: true,
                    output: '🔉 Volume decreased',
                    isAI: false
                });
                break;
                
            case 'mute':
                await systemCommands.setVolume('mute');
                callback({
                    success: true,
                    output: '🔇 Volume muted',
                    isAI: false
                });
                break;
                
            case 'unmute':
                await systemCommands.setVolume('unmute');
                callback({
                    success: true,
                    output: '🔊 Volume unmuted',
                    isAI: false
                });
                break;
                
            case 'play':
                await systemCommands.mediaControl('play');
                callback({
                    success: true,
                    output: '🎵 Playing media',
                    isAI: false
                });
                break;
                
            case 'pause':
                await systemCommands.mediaControl('pause');
                callback({
                    success: true,
                    output: '⏸️ Media paused',
                    isAI: false
                });
                break;
                
            case 'next':
                await systemCommands.mediaControl('next');
                callback({
                    success: true,
                    output: '⏭️ Next track',
                    isAI: false
                });
                break;
                
            case 'previous':
                await systemCommands.mediaControl('previous');
                callback({
                    success: true,
                    output: '⏮️ Previous track',
                    isAI: false
                });
                break;
                
            case 'screenshot':
                await systemCommands.takeScreenshot();
                callback({
                    success: true,
                    output: '📸 Screenshot taken and saved to Desktop',
                    isAI: false
                });
                break;
                
            case 'systemInfo':
                const systemInfo = await systemCommands.getSystemInfo();
                const infoText = `💻 System Information:
• Platform: ${systemInfo.platform}
• Architecture: ${systemInfo.arch}
• CPUs: ${systemInfo.cpus}
• Total Memory: ${systemInfo.totalMemory}
• Free Memory: ${systemInfo.freeMemory}
• Uptime: ${systemInfo.uptime}
• User: ${systemInfo.userInfo}`;
                callback({
                    success: true,
                    output: infoText,
                    isAI: false
                });
                break;
                
            case 'openApp':
                const appName = parameters.trim();
                await openApplication(appName, callback);
                break;
                
            case 'search':
                const query = parameters.trim();
                await systemCommands.searchWeb(query);
                callback({
                    success: true,
                    output: `🔍 Searching the web for: ${query}`,
                    isAI: false
                });
                break;
                
            case 'website':
                const siteName = parameters.trim();
                await openWebsite(siteName, callback);
                break;

            case 'openFile':
                const filePath = parameters.trim();
                await systemCommands.openPath(filePath);
                callback({
                    success: true,
                    output: `📁 Opening file: ${filePath}`,
                    isAI: false
                });
                break;

            case 'openFolder':
                const folderPath = parameters.trim();
                await systemCommands.openPath(folderPath);
                callback({
                    success: true,
                    output: `📂 Opening folder: ${folderPath}`,
                    isAI: false
                });
                break;
                
            default:
                callback({
                    success: false,
                    error: `Unknown command type: ${type}`,
                    isAI: false
                });
        }
    } catch (error) {
        console.error(`Command execution error (${type}):`, error);
        callback({
            success: false,
            error: `Failed to execute ${type}: ${error.message}`,
            isAI: false
        });
    }
}

// Application opening
async function openApplication(appName, callback) {
    const platform = os.platform();
    
    const appMap = {
        'chrome': { 
            win: 'start chrome', 
            mac: 'open -a "Google Chrome"', 
            linux: 'google-chrome',
            name: 'Google Chrome'
        },
        'notepad': { 
            win: 'notepad', 
            mac: 'open -a TextEdit', 
            linux: 'gedit',
            name: 'Text Editor'
        },
        'calculator': { 
            win: 'calc', 
            mac: 'open -a Calculator', 
            linux: 'gnome-calculator',
            name: 'Calculator'
        },
        'spotify': { 
            win: 'spotify', 
            mac: 'open -a Spotify', 
            linux: 'spotify',
            name: 'Spotify'
        },
        'file explorer': {
            win: 'explorer',
            mac: 'open .',
            linux: 'nautilus',
            name: 'File Explorer'
        }
    };
    
    const normalizedAppName = appName.toLowerCase();
    let command = '';
    let displayName = appName;

    if (appMap[normalizedAppName]) {
        command = appMap[normalizedAppName][platform === 'win32' ? 'win' : platform === 'darwin' ? 'mac' : 'linux'];
        displayName = appMap[normalizedAppName].name;
    } else {
        if (platform === 'win32') {
            command = `start "" "${appName}"`;
        } else if (platform === 'darwin') {
            command = `open -a "${appName}"`;
        } else {
            command = appName;
        }
    }
    
    exec(command, (error) => {
        if (error) {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(appName + ' download')}`;
            shell.openExternal(searchUrl);
            callback({
                success: true,
                output: `🔍 "${appName}" not found locally. Opening web search for download options.`,
                isAI: false
            });
        } else {
            callback({
                success: true,
                output: `✅ Launched ${displayName}`,
                isAI: false
            });
        }
    });
}

// Website opening
async function openWebsite(siteName, callback) {
    const websiteMap = {
        'youtube': { url: 'https://youtube.com', name: 'YouTube' },
        'facebook': { url: 'https://facebook.com', name: 'Facebook' },
        'instagram': { url: 'https://instagram.com', name: 'Instagram' },
        'gmail': { url: 'https://gmail.com', name: 'Gmail' },
        'google': { url: 'https://google.com', name: 'Google' },
        'github': { url: 'https://github.com', name: 'GitHub' },
        'twitter': { url: 'https://twitter.com', name: 'Twitter' },
        'linkedin': { url: 'https://linkedin.com', name: 'LinkedIn' }
    };
    
    const normalizedSite = siteName.toLowerCase().replace(/\s+/g, '');
    
    if (websiteMap[normalizedSite]) {
        await systemCommands.openURL(websiteMap[normalizedSite].url);
        callback({
            success: true,
            output: `🌐 Opening ${websiteMap[normalizedSite].name}`,
            isAI: false
        });
    } else {
        // Try with .com extension
        await systemCommands.openURL(`https://${normalizedSite}.com`);
        callback({
            success: true,
            output: `🌐 Opening ${siteName}.com`,
            isAI: false
        });
    }
}

// Main command execution
async function executeCommand(command, callback) {
    console.log(`🎯 Executing: "${command}"`);
    
    try {
        const aiResult = await advancedAI.processCommand(command);
        
        if (aiResult.shouldExecute) {
            await executeSystemCommand(aiResult, callback);
        } else {
            callback({
                success: true,
                output: aiResult.response,
                isAI: true,
                command: command
            });
        }
    } catch (error) {
        console.error('Command execution error:', error);
        callback({
            success: false,
            error: `Failed to process command: ${error.message}`,
            isAI: false
        });
    }
}

// IPC Handlers
ipcMain.handle('system-command', async (event, command) => {
    return new Promise((resolve) => {
        executeCommand(command, resolve);
    });
});

ipcMain.handle('get-system-info', async () => {
    return {
        platform: os.platform(),
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        hostname: os.hostname(),
        arch: os.arch(),
        username: os.userInfo().username
    };
});

ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
    return { success: true };
});

ipcMain.handle('get-ai-status', async () => {
    return {
        enabled: AI_CONFIG.enabled,
        provider: AI_CONFIG.provider,
        model: AI_CONFIG.model,
        hasGeminiKey: !!AI_CONFIG.geminiApiKey
    };
});

// Enhanced restart handler
ipcMain.handle('restart-system', async () => {
    try {
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: 'Confirm Restart',
            message: 'Are you sure you want to restart the computer?',
            detail: 'Computer will restart in 5 seconds. Save all your work.',
            buttons: ['Cancel', 'Restart'],
            defaultId: 0,
            cancelId: 0
        });

        if (result.response === 1) {
            await systemCommands.restart();
            return { success: true, message: '🔄 Computer will restart in 5 seconds...' };
        } else {
            return { success: false, message: 'Restart cancelled.' };
        }
    } catch (error) {
        console.error('Restart error:', error);
        return { success: false, message: `Restart failed: ${error.message}` };
    }
});

function createWindow() {
    console.log('🚀 Creating JARVIS window...');
    
    mainWindow = new BrowserWindow({
        width: 500,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false,
            allowRunningInsecureContent: true
        },
        title: 'JARVIS AI - Advanced System Controls',
        show: false,
        resizable: true,
        center: true,
        backgroundColor: '#0a0a0a',
        icon: path.join(__dirname, 'assets', 'icon.png') // Optional: add an icon
    });

    mainWindow.loadFile('index.html');
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    console.log('✅ Electron app ready');
    createWindow();

    // Global shortcut Ctrl+J to show/hide
    globalShortcut.register('CommandOrControl+J', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    console.log('🛑 All windows closed');
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// Handle app single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}