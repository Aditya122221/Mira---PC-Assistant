// @ts-ignore
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { exec } from "child_process";
import { SOFTWARE_MAP, SOFTWARE_ALIASES } from "./SoftwareMap.js";
import axios from 'axios'
import whisper from "node-whisper";
import fs from "fs";
import multer from 'multer'
import path from 'path'

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

(async () => {
    try {
        const c = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`Database connected to ${c.connection.host}`);
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
    }
})();

// 📦 Schemas
const ChatSchema = new mongoose.Schema({
    role: String,
    content: String,
    ts: { type: Date, default: Date.now },
});

const FactSchema = new mongoose.Schema({
    key: String,
    value: String,
    ts: { type: Date, default: Date.now },
    remindAt: Date,
    resolved: { type: Boolean, default: false },
    reminded: { type: Boolean, default: false },
});

const Chat = mongoose.model("Chat", ChatSchema);
const Fact = mongoose.model("Fact", FactSchema);

// 📡 Routes
app.get("/chat", async (req, res) => {
    const chats = await Chat.find().sort({ ts: 1 }).limit(20);
    res.json(chats);
});

app.post("/chat", async (req, res) => {
    const chat = new Chat(req.body);
    await chat.save();
    res.json(chat);
});

app.get("/facts", async (req, res) => {
    const facts = await Fact.find().sort({ ts: -1 }).limit(20);
    res.json(facts);
});

app.post("/facts", async (req, res) => {
    try {
        if (req.body.remindAt) {
            req.body.remindAt = new Date(req.body.remindAt);
        }
        const fact = new Fact(req.body);
        await fact.save();
        res.json(fact);
    } catch (err) {
        res.status(400).json({ error: "Save failed", details: err.message });
    }
});

app.get("/reminders", async (req, res) => {
    const now = new Date();
    const reminders = await Fact.find({
        key: "reminder",
        remindAt: { $lte: now },
        resolved: false,
        reminded: false,
    }).sort({ remindAt: 1 });
    res.json(reminders);
});

app.patch("/facts/:id", async (req, res) => {
    try {
        if (req.body.remindAt) {
            req.body.remindAt = new Date(req.body.remindAt);
        }
        const updated = await Fact.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: "Update failed", details: err.message });
    }
});

app.patch("/reminders/:id", async (req, res) => {
    try {
        if (req.body.remindAt) {
            req.body.remindAt = new Date(req.body.remindAt);
        }
        const updated = await Fact.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: "Update failed", details: err.message });
    }
});

function findSoftwareExe(userInput) {
    const input = userInput.toLowerCase();

    for (const [key, aliases] of Object.entries(SOFTWARE_ALIASES)) {
        if (aliases.some(alias => input.includes(alias))) {
            return SOFTWARE_MAP[key];
        }
    }
    return null;
}

app.post("/open-software", (req, res) => {
    const { softwareName } = req.body;
    if (!softwareName) {
        return res.status(400).json({ success: false, message: "Software name is required." });
    }

    const exeName = findSoftwareExe(softwareName);
    if (!exeName) {
        return res.json({ success: false, message: `I don't know how to open ${softwareName}.` });
    }

    const command = `start "" "${exeName}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.json({ success: false, message: `Could not open ${softwareName}.` });
        }
        if (stderr && stderr.toLowerCase().includes("cannot find")) {
            return res.json({ success: false, message: `Could not find ${softwareName}.` });
        }
        res.json({ success: true, message: `Opened ${softwareName}.` });
    });
});

app.post('/speak', async (req, res) => {
    try {
        const text = (req.body.text || '').slice(0, 500);
        const voiceId = '32b3f3c5-7171-46aa-abe7-b598964aa793';
        if (!text) return res.status(400).json({ error: 'empty text' });

        const payload = {
            model_id: 'sonic-2',               // recommended model
            transcript: text,
            voice: { mode: 'id', id: voiceId },
            output_format: { container: 'mp3', bit_rate: 128000, sample_rate: 44100 },
            language: 'en'
        };

        const cartesiaRes = await axios.post(
            'https://api.cartesia.ai/tts/bytes',
            payload,
            {
                responseType: 'arraybuffer',
                headers: {
                    'Authorization': `Bearer ${process.env.CARTESIA_API_KEY}`,
                    'Cartesia-Version': '2025-04-16',
                    'Content-Type': 'application/json'
                }
            }
        );

        // forward audio bytes to client
        res.set('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(cartesiaRes.data));
    } catch (err) {
        console.error('Cartesia error:', err.response?.data || err.message);
        res.status(500).json({ error: 'tts_failed', details: err.response?.data || err.message });
    }
});

app.get('/getvoice', async (req, res) => {
    const voices = await axios.get('https://api.cartesia.ai/voices?limit=100', {
        headers: {
            'Authorization': `Bearer ${process.env.CARTESIA_API_KEY}`,
            'Cartesia-Version': '2025-04-16'
        }
    });

    const animeLike = voices.data.data.filter(v =>
        /(anime|cartoon|character|bright|playful|cute|youthful)/i.test(v.name + " " + v.description)
    );

    return res.json({ animeLike })
})

app.post("/stt", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file uploaded" });
        }

        const inputPath = req.file.path;
        const renamedPath = `${inputPath}.webm`;
        fs.renameSync(inputPath, renamedPath);

        const wavPath = `${inputPath}.wav`;

        // 🎵 Convert to 16kHz mono WAV
        await new Promise((resolve, reject) => {
            exec(
                `ffmpeg -i "${renamedPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}"`,
                (err) => (err ? reject(err) : resolve())
            );
        });

        // 📝 Run Whisper CLI
        await new Promise((resolve, reject) => {
            exec(
                `whisper "${wavPath}" --model medium --output_dir uploads --output_format txt`,
                (err) => (err ? reject(err) : resolve())
            );
        });

        // 🔎 Whisper output can be either "<filename>.wav.txt" OR "<filename>.txt"
        const baseNameNoExt = path.basename(wavPath, ".wav"); // e.g. "abc123"
        const baseNameWithExt = path.basename(wavPath);       // e.g. "abc123.wav"

        const transcriptPath1 = path.join("uploads", `${baseNameWithExt}.txt`).replace(/\\/g, "/"); // abc123.wav.txt
        const transcriptPath2 = path.join("uploads", `${baseNameNoExt}.txt`).replace(/\\/g, "/");   // abc123.txt

        // 🔄 Retry until transcript file appears
        async function waitForFile(filePath, retries = 5, delay = 300) {
            for (let i = 0; i < retries; i++) {
                if (fs.existsSync(filePath)) return filePath;
                await new Promise(r => setTimeout(r, delay));
            }
            return null;
        }

        let transcriptPath = await waitForFile(transcriptPath1);
        if (!transcriptPath) {
            transcriptPath = await waitForFile(transcriptPath2);
        }

        // console.log("Final transcript path:", transcriptPath);

        if (!transcriptPath) {
            return res.status(200).json({ status: false, message: "Sorry Sir, file is not ready" });
        }

        const transcript = fs.readFileSync(transcriptPath, "utf-8");

        if (!transcript.trim()) {
            return res.status(200).json({ status: false, message: "Sorry Sir, I didn't listen anything" });
        }

        // 🧹 Cleanup temp files safely
        [renamedPath, wavPath, transcriptPath].forEach(file => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        });

        fs.existsSync(renamedPath) && fs.unlinkSync(renamedPath);
        fs.existsSync(wavPath) && fs.unlinkSync(wavPath);

        return res.status(200).json({ status: true, text: transcript });
    } catch (err) {
        console.error("❌ Whisper error:", err);
        res.status(500).json({ error: "Transcription failed", details: err.message });
    }
});

// ✅ Start
app.listen(5000, () => console.log("✅ Mira backend running on http://localhost:5000"));