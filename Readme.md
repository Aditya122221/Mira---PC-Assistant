##  Mira - PC Assistant

* Developed a personal desktop assistant capable of opening desktop applications, launching websites, and streaming music from YouTube.
* Integrated Whisper for speech recognition to enable accurate, real-time voice command processing.
* Built a conversational AI interface that provides both practical assistance (task execution) and casual, advisor-like interactions.
* Designed a modular, extensible architecture to easily add new features and commands.
* Automated repetitive tasks, enhancing overall user productivity and system efficiency.

## 📁 Directory Structure

.
├── README.md
├── Backend/
│   ├── .env
│   ├── index.js
│   ├── package-lock.json
│   ├── package.json
│   ├── SoftwareMap.js
├── Frontend/
│   ├── .env
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── vercel.json
│   ├── vite.config.js
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── index.css
│       ├── App.jsx
│       ├── main.jsx


## 🛠️ Installation Steps:

<p>1. Clone Repositories</p>

```
git clone https://github.com/Aditya122221/Mira---PC-Assistant.git
```

<p>2. Frontend Installation</p>

```
cd pc-assistant
```
```
npm install
```

<p>3. Backend Installation</p>

```
cd Backend
```
```
npm install
```

<p>Optional: If you want to use as desktop app</p>

```
cd pc-assistant
```

```
npm run build
```

```
npm run dist
```

<p>A PC-Assistant.exe file will be generated in the dist folder which you can run as pc software</p>

<p>4. .env Set up</p>
I have provided my .env file for testing purpose only. Please use your own api key for personal use. Just use your own mongodb uri during testing.

## 🛠️ Technologies Used

*   <strong>Frontend:</strong> React JS, CSS
*   <strong>Backend:</strong> Express, Node JS, whisper
*   <strong>Database:</strong> Mongo DB