import express from "express";
import mongoose from "mongoose";
import cors from "cors";

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

// ✅ Start
app.listen(5000, () => console.log("✅ Mira backend running on http://localhost:5000"));
