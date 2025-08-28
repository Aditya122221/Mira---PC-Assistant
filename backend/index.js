import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { exec } from "child_process";
import { SOFTWARE_MAP, SOFTWARE_ALIASES } from "./SoftwareMap.js";

const app = express();
app.use(cors());
app.use(express.json());

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

// ✅ Start
app.listen(5000, () => console.log("✅ Mira backend running on http://localhost:5000"));
