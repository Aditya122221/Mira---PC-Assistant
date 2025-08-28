// Aliases (different ways a user might say the app)
const SOFTWARE_ALIASES = {
    // 🖥️ Windows built-in
    notepad: ["notepad", "note pad"],
    calculator: ["calculator", "calc"],
    paint: ["paint", "mspaint", "microsoft paint"],
    wordpad: ["wordpad", "write", "word pad"],
    explorer: ["explorer", "file explorer", "windows explorer"],
    cmd: ["cmd", "command prompt", "terminal", "dos"],
    powershell: ["powershell", "ps"],
    taskManager: ["task manager", "taskmgr"],
    controlPanel: ["control panel"],
    settings: ["settings", "windows settings"],
    clock: ["clock", "alarm", "alarms and clock"],

    // 📊 Microsoft Office
    word: ["word", "ms word", "microsoft word"],
    excel: ["excel", "ms excel", "microsoft excel"],
    powerpoint: ["powerpoint", "ppt", "ms powerpoint"],
    outlook: ["outlook", "ms outlook", "microsoft outlook", "email"],
    onenote: ["onenote", "ms onenote", "microsoft onenote"],
    access: ["access", "ms access", "microsoft access"],
    publisher: ["publisher", "ms publisher", "microsoft publisher"],

    // 🌐 Browsers
    chrome: ["chrome", "google chrome", "browser"],
    edge: ["edge", "microsoft edge"],
    brave: ["brave", "brave browser"],

    // 💻 Dev tools
    vscode: ["vscode", "vs code", "visual studio code", "code"],
    gitbash: ["git bash", "gitbash"],

    // 📱 Communication
    teams: ["teams", "microsoft teams", "ms teams", "m s teams"],
    whatsapp: ["whatsapp", "whatsapp desktop"],
    telegram: ["telegram"],
    copilot: ["copilot", "microsoft copilot", "github copilot", "co-pilot"],
    steam: ["steam"],
    epic: ["epic", "epic games", "epic games launcher"],
    rockstar: ["rockstar", "rockstar games", "rockstar games launcher"],
    rust: ["rust"],

    // 📚 Other
    adobeReader: ["acrobat", "adobe reader", "acrobat reader", "pdf reader"],
    getscreen: ["getscreen", "remote desktop", "getscreen remote", "get screen"],
    chatgpt: ["chatgpt", "openai chatgpt", "gpt", "chat gpt"],
};

// Executables (what to actually run)
const SOFTWARE_MAP = {
    // 🖥️ Windows built-in
    notepad: "notepad.exe",
    calculator: "calc.exe",
    paint: "mspaint.exe",
    wordpad: "write.exe",
    explorer: "explorer.exe",
    cmd: "cmd.exe",
    powershell: "powershell.exe",
    taskManager: "taskmgr.exe",
    controlPanel: "control.exe",
    settings: "ms-settings:",
    clock: "ms-clock:",

    // 📊 Microsoft Office
    word: "winword.exe",
    excel: "excel.exe",
    powerpoint: "powerpnt.exe",
    outlook: "outlook.exe",
    onenote: "onenote.exe",
    access: "msaccess.exe",
    publisher: "mspub.exe",

    // 🌐 Browsers
    chrome: "chrome.exe",
    edge: "msedge.exe",
    brave: "brave.exe",

    // 💻 Dev tools
    vscode: "code",
    gitbash: "git-bash.exe",

    teams: "teams.exe",
    whatsapp: "whatsapp.exe",
    telegram: "telegram.exe",
    copilot: "copilot.exe",

    steam: "steam.exe",
    epic: "EpicGamesLauncher.exe",
    rockstar: "Launcher.exe", // usually under Rockstar Games folder
    rust: "RustClient.exe",

    adobeReader: "AcroRd32.exe",
    getscreen: "getscreen.me",
    chatgpt: "chatgpt.exe",
};

export { SOFTWARE_MAP, SOFTWARE_ALIASES };
