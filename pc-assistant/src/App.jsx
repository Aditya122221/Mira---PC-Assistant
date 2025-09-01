import { useState, useEffect, useRef } from "react";
import AI from "./assets/ai-assistant.png";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🔑 API keys
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// MongoDB API
const API_BASE = "http://localhost:5000";
const LS_CHAT_KEY = "mira.chat.history.v1";
const LS_FACTS_KEY = "mira.facts.v1";
const CHAT_MEMORY_LIMIT = 12; // last N turns kept in memory
const FACTS_LIMIT = 20;       // maximum saved facts

const APP_MAP = {
	youtube: "https://www.youtube.com",
	google: "https://www.google.com",
	chrome: "https://www.google.com",
	gmail: "https://mail.google.com",
	amazon: "https://www.amazon.in",
	flipkart: "https://www.flipkart.com",
	twitter: "https://x.com",
	github: "https://github.com",
};

const parseTime = (timeText) => {
	const now = new Date();
	let remindAt = new Date(now);

	const text = timeText.toLowerCase().trim();

	// Default time
	remindAt.setHours(9, 0, 0, 0);

	// Handle "tomorrow", "today", "tonight"
	if (text.includes("tomorrow")) {
		remindAt.setDate(remindAt.getDate() + 1);
	} else if (text.includes("tonight")) {
		remindAt.setHours(20, 0, 0, 0); // 8pm tonight
	} else if (text.includes("today")) {
		// stays today, time handled below
	}

	// Handle explicit time (e.g. "6pm", "18:30")
	const match = text.match(/(\d{1,2})(?::(\d{2}))?\s?(am|pm)?/i);
	if (match) {
		let hours = parseInt(match[1], 10);
		let minutes = match[2] ? parseInt(match[2], 10) : 0;
		const ampm = match[3]?.toLowerCase();

		if (ampm === "pm" && hours < 12) hours += 12;
		if (ampm === "am" && hours === 12) hours = 0;

		remindAt.setHours(hours, minutes, 0, 0);
	}

	// If calculated time is already in the past → push to tomorrow
	if (remindAt < now) {
		remindAt.setDate(remindAt.getDate() + 1);
	}

	return remindAt;
};



// ─────────────────────────────
// MongoDB helpers
// ─────────────────────────────
const fetchChatHistory = async () => {
	const res = await fetch(`${API_BASE}/chat`);
	return res.json();
};
const saveChatMessage = async (msg) => {
	await fetch(`${API_BASE}/chat`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(msg),
	});
};
const fetchFacts = async () => {
	const res = await fetch(`${API_BASE}/facts`);
	return res.json();
};
const saveFact = async (fact) => {
	await fetch(`${API_BASE}/facts`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(fact),
	});
};
const fetchReminders = async () => {
	const res = await fetch(`${API_BASE}/reminders`);
	return res.json();
};

// ─────────────────────────────
// Mood detection
// ─────────────────────────────
const detectMood = (text = "") => {
	const t = text.toLowerCase();
	const flags = {
		sad: /(sad|down|upset|lonely|cry)/i.test(t),
		stressed: /(stressed|anxious|overwhelmed|panic)/i.test(t),
		angry: /(angry|frustrated|furious|irritated|rage)/i.test(t),
		happy: /(happy|excited|joyful|great|awesome)/i.test(t),
		crisis: /(suicide|kill myself|end my life|i want to die)/i.test(t),
	};
	if (flags.crisis) return "crisis";
	if (flags.sad) return "sad";
	if (flags.stressed) return "stressed";
	if (flags.angry) return "angry";
	if (flags.happy) return "happy";
	return "neutral";
};

// ─────────────────────────────
// Fact extractor (same as before)
// ─────────────────────────────
const extractFact = (text = "") => {
	const t = text.trim();

	// Reminder
	const reminder = t.match(/remind me (?:to|about) (.+?)(?: (?:at|on)? (.+))?$/i);
	if (reminder) {
		const task = reminder[1].trim();
		const timeText = reminder[2]?.trim() || null;
		let remindAt = null;
		if (timeText) {
			remindAt = parseTime(timeText);
		}
		return { key: "reminder", value: task, remindAt };
	}

	// Problem
	const problem = t.match(/(?:i have|i'm facing|i got) (?:a |an )?problem(?: with)? (.+)/i);
	if (problem) return { key: "problem", value: problem[1].trim() };

	// Other
	const rememberThat = t.match(/remember that (.+)/i);
	if (rememberThat) return { key: "note", value: rememberThat[1].trim() };

	const myIs =
		t.match(/remember\s+my\s+([^]+?)\s+is\s+([^]+)$/i) ||
		t.match(/my\s+([^]+?)\s+is\s+([^]+)$/i);
	if (myIs) return { key: myIs[1].trim().toLowerCase(), value: myIs[2].trim() };

	const nameIs = t.match(/(?:i am|i'm|my name is)\s+([a-z ]{2,40})$/i);
	if (nameIs) return { key: "name", value: nameIs[1].trim() };

	return null;
};

// ─────────────────────────────
// Main App
// ─────────────────────────────
const App = () => {
	const [voices, setVoices] = useState([]);
	const [status, setStatus] = useState("Click 'Activate Mira', then speak");
	const [isActive, setIsActive] = useState(false);
	const [liveTranscript, setLiveTranscript] = useState("");
	const [chat, setChat] = useState([]);
	const [facts, setFacts] = useState([]);
	const [transcript, setTranscript] = useState(""); // User speech -> text
	const [reply, setReply] = useState("");           // Mira’s reply
	const [recording, setRecording] = useState(false);

	// Refs
	const recognitionRef = useRef(null);
	const speechReadyRef = useRef(false);
	const isSpeakingRef = useRef(false);
	const isBusyRef = useRef(false);
	const startedRef = useRef(false);
	const lastTranscriptRef = useRef("");
	const introducedRef = useRef(false);
	const mediaRecorderRef = useRef(null);
	const audioChunksRef = useRef([]);

	// 🔊 Speak
	const speak = async (text, callback) => {
		await playText(text);

		if (typeof callback === "function") {
			await callback();
		}
	};


	// client/src/playTTS.js
	async function playText(text) {
		isSpeakingRef.current = true; // block recognition

		const resp = await fetch(`${API_BASE}/speak`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text }),
		});

		if (!resp.ok) {
			const err = await resp.json().catch(() => ({ error: "unknown" }));
			isSpeakingRef.current = false;
			throw new Error("TTS failed: " + JSON.stringify(err));
		}

		const arrayBuffer = await resp.arrayBuffer();
		const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
		const url = URL.createObjectURL(blob);
		const a = new Audio(url);

		await new Promise((resolve, reject) => {
			a.onended = () => {
				isSpeakingRef.current = false;
				resolve();
			};
			a.onerror = (err) => {
				isSpeakingRef.current = false;
				if (!isBusyRef.current) restartRecognition();
				reject(err);
			};
			a.play();
		});

		setTimeout(() => URL.revokeObjectURL(url), 30000);
	}


	// Push chat
	const pushUser = async (content) => {
		setChat((prev) => [...prev, { role: "user", content, ts: Date.now() }]);
		await saveChatMessage({ role: "user", content });
	};
	const pushAssistant = async (content) => {
		setChat((prev) => [...prev, { role: "assistant", content, ts: Date.now() }]);
		await saveChatMessage({ role: "assistant", content });
	};

	// Init
	useEffect(() => {
		const loadVoices = () => {
			const list = window.speechSynthesis.getVoices();
			setVoices(list);
		};
		loadVoices();
		window.speechSynthesis.onvoiceschanged = loadVoices;
		(async () => {
			setChat(await fetchChatHistory());
			setFacts(await fetchFacts());
		})();
	}, []);

	// 🔓 Unlock speech
	const unlockSpeech = async () => {
		const greetAndRemind = async () => {
			speechReadyRef.current = true;
			setIsActive(true);
			const greeting = "Hello";
			await pushAssistant(greeting);
			speak(greeting, async () => {
				const factsList = await fetchFacts();

				// ✅ Handle unresolved problems
				const unresolved = factsList.filter(
					(f) => f.key === "problem" && !f.resolved && !f.reminded
				);
				if (unresolved.length > 0) {
					const firstProblem = unresolved[0];
					const msg = `Previously, you mentioned facing the problem: "${firstProblem.value}". May I ask if it has been resolved?`;
					await pushAssistant(msg);
					speak(msg);

					// mark problem reminded
					await fetch(`${API_BASE}/facts/${firstProblem._id}`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ reminded: true }),
					});
				}

				// ✅ Handle reminders (unchanged) ...
				const reminders = await fetchReminders();
				if (reminders.length > 0) {
					for (let r of reminders) {
						if (!r.reminded) {
							const msg = `Reminder: You asked me to remind you about "${r.value}".`;
							await pushAssistant(msg);
							speak(msg);
							await fetch(`${API_BASE}/reminders/${r._id}`, {
								method: "PATCH",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ reminded: true }),
							});
						}
					}
				}
			});
		};

		greetAndRemind()
	};

	// 🧠 All your original functions stay:
	// parseWithGemini, executeCommand, handleConversation,
	// startRecognition, stopRecognition, restartRecognition
	// ➝ no changes except storage calls point to MongoDB

	// ─────────────────────────────
	// 🤖 Gemini — Intent Parser
	// ─────────────────────────────
	const parseWithGemini = async (text) => {
		try {
			setStatus("Parsing your command…");

			const prompt = `
You are a command parser for the AI assistant Mira.

1. First, correct all typos in the transcript.For example, "yutu" → "YouTube", "vcode" → "VSCode", etc.
2. Then parse the corrected transcript into JSON with exactly these fields:
			{
				"wake": true | false,
				"intent": "string",
				"target": "string|null",
				"query": "string|null",
				"corrected_transcript": "string"
			}

			Rules:
			- "wake" must be true if the transcript mentions Mira or variants(even with minor typos) like "mira", "meera", "mirra", "myra", "mirah", "mierra" or affectionate terms like "baby", "babe", "sweetheart".
- If wake is false, set other fields to null.
- "intent" is a short verb like "open", "search", "play", "chat", etc.
- "target" is the app, site, or entity.
- "query" is the rest of the user request.
- Do not explain.JSON only.

				Examples:
			Transcript: "hey mira open yutu"
			{
				"wake": true,
				"intent": "open",
				"target": "youtube",
				"query": null,
				"corrected_transcript": "hey mira open YouTube"
			}

			Transcript: "what is the weather today"
			{
				"wake": false,
				"intent": null,
				"target": null,
				"query": null,
				"corrected_transcript": "what is the weather today"
			}`;

			const res = await model.generateContent(`${prompt} \nUser: "${text}"`);
			const raw = res.response.text().trim();

			const i = raw.indexOf("{");
			const j = raw.lastIndexOf("}");
			if (i === -1 || j === -1) return null;

			const parsed = JSON.parse(raw.slice(i, j + 1));
			return parsed;
		} catch (err) {
			console.error("❌ Gemini parse error:", err);
			return null;
		}
	};

	// ─────────────────────────────
	// 🔎 Google Custom Search
	// ─────────────────────────────
	const googleSearchTopLink = async (query) => {
		const key = import.meta.env.VITE_GOOGLE_CSE_KEY;
		const cx = import.meta.env.VITE_GOOGLE_CSE_CX;

		try {
			if (key && cx) {
				const url =
					`https://www.googleapis.com/customsearch/v1?` +
					`key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&num=1&q=${encodeURIComponent(
						query
					)}`;
				const res = await fetch(url);
				if (res.ok) {
					const data = await res.json();
					const link = data?.items?.[0]?.link || null;
					if (link) return link;
				}
			}
		} catch (e) {
			console.error("❌ CSE error:", e);
		}
		return null;
	};

	// ─────────────────────────────
	// 💬 Conversation / Empathy
	// ─────────────────────────────
	const handleConversation = async (userInput, detectedMood = "neutral") => {
		try {
			setStatus("Thinking…");

			// Update memory: extract facts if any
			const fact = extractFact(userInput);
			if (fact) {
				if (fact.key === "reminder") {
					if (fact.remindAt && new Date(fact.remindAt) < new Date()) {
						// ignore past reminders
						console.log("⏭️ Ignoring reminder in the past:", fact.value);
					} else {
						await saveFact(fact);
					}
				} else if (fact.key === "problem") {
					// ✅ ensure default flags so they can be checked later
					await saveFact({ ...fact, resolved: false, reminded: false });
				} else {
					await saveFact(fact);
				}
			}

			// Crisis support
			if (detectedMood === "crisis") {
				const crisisReply = [
					"I'm really sorry you're feeling this way. You matter, and you’re not alone.",
					"If you’re in immediate danger, please contact local emergency services right now.",
					"Talking to someone you trust can help — a close friend or family member.",
					"If you can, consider reaching out to a professional counselor or a local helpline in your area."
				].join(" ");
				pushAssistant(crisisReply);
				speak(crisisReply, finishTask);
				return;
			}

			// Prepare concise conversation history (last few exchanges)
			const history = chat.slice(-CHAT_MEMORY_LIMIT);
			const factsList = await fetchFacts();

			const sys = `
You are Mira — warm, wise, and helpful. Be empathetic and encouraging.
- If user is sad/stressed/angry, comfort briefly and, when helpful, include a short, relevant story or lesson from Mahabharata, Ramayana, Bhagavad Gita, Bible, Quran, or real life achievers. Keep it respectful and non-preachy.
- If user asks factual questions, answer clearly and simply.
- Use 2–6 sentences. Speak naturally, no markdown, no numbered lists.
- If asked to remember personal info, acknowledge and remember.
- If you are not sure about a fact, be honest and suggest how to verify.
Persona details:
${factsList.length ? `Known facts: ${factsList.map(f => `${f.key}: ${f.value}`).join("; ")}` : "No stored personal facts yet."}
`;

			// Build prompt text for Gemini
			const historyText = history
				.map((m) => (m.role === "user" ? `User: ${m.content}` : `Mira: ${m.content}`))
				.join("\n");

			const convoPrompt = `
${sys}

Conversation so far:
${historyText}

User mood (heuristic): ${detectedMood}
User: "${userInput}"
Mira:
`;

			const res = await model.generateContent(convoPrompt);
			const answer = (res.response.text() || "").trim();

			pushAssistant(answer);
			speak(answer, finishTask);
		} catch (err) {
			console.error("❌ Chat error:", err);
			const fallback = "Sorry, I couldn’t think of a good reply right now, but I’m here with you.";
			pushAssistant(fallback);
			speak(fallback, finishTask);
		}
	};

	// ─────────────────────────────
	// 🧠 Command Execution
	// ─────────────────────────────
	const executeCommand = async (parsed, transcript) => {
		try {
			if (!parsed) {
				// Fallback → conversation
				const mood = detectMood(transcript);
				return handleConversation(transcript, mood);
			}

			const { wake, intent, target, query } = parsed;
			const normTarget = target ? String(target).toLowerCase() : null;
			const q = (query || "").toString().trim();

			// Local fallback wake words (in case Gemini misses)
			const wakeWords = ["mira", "meera", "myra", "mirra", "miraah", "sweetheart", "babe", "baby"];
			const saidWakeWord = wakeWords.some((w) => transcript.toLowerCase().includes(w));

			if (!wake && !saidWakeWord) {
				finishTask();
				return;
			}

			if (intent === "greet" && !introducedRef.current) {
				introducedRef.current = true;
				setStatus("Executing: greet");
				const msg = "Hello sir, I’m listening!";
				pushAssistant(msg);
				speak(msg, finishTask);
				return;
			}

			if (intent === "introduce") {
				setStatus("Executing: introduce");
				const msg = "Hello, my name is Mira. I am an AI assistant created by Aditya. I’m here to help you with your tasks — whether that’s running applications on your PC, opening websites, playing songs or videos, or simply being your chat partner. You can talk to me about anything — from solving problems to just having a friendly conversation.";
				pushAssistant(msg);
				speak(msg, finishTask);
				return;
			}

			if (intent === "search") {
				setStatus(`Executing: search → ${normTarget || "google"} ${q}`);
				const onDone = async () => {
					if (normTarget === "youtube") {
						window.open(
							`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
							"_blank"
						);
					} else {
						const link = await googleSearchTopLink(q);
						if (link) window.open(link, "_blank");
						else
							window.open(
								`https://www.google.com/search?q=${encodeURIComponent(q)}`,
								"_blank"
							);
					}
					finishTask();
				};
				pushAssistant(`Searching ${q}…`);
				speak(`Searching ${q}`, onDone);
				return;
			}

			if (intent === "play") {
				setStatus(`Executing: play → ${q}`);

				const onDone = async () => {
					let searchQuery = q;

					// Try direct YouTube best guess via CSE
					const watchLink = await googleSearchTopLink(`site:youtube.com ${searchQuery}`);
					if (watchLink) {
						window.open(watchLink, "_blank");
					} else {
						window.open(
							`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
							"_blank"
						);
					}
					finishTask();
				};

				pushAssistant(`Playing ${q} on YouTube…`);
				speak(`Playing ${q} on YouTube`, onDone);
				return;
			}

			if (intent === "open") {
				const label = q || normTarget || "";
				setStatus(`Executing: open → ${label}`);
				const onDone = async () => {
					if (normTarget && APP_MAP[normTarget]) {
						window.open(APP_MAP[normTarget], "_blank");
						finishTask();
						return;
					}
					const searchTerm = q || normTarget || "";
					const link = await googleSearchTopLink(searchTerm);
					if (link) window.open(link, "_blank");
					else
						window.open(
							`https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`,
							"_blank"
						);
					finishTask();
				};
				pushAssistant(`Opening ${label}…`);
				speak(`Opening ${label}`, onDone);
				return;
			}

			// 🆕 Mood boost — do something, not just talk
			if (intent === "mood_boost") {
				const mood = normTarget || q || "happy";
				setStatus(`Executing: mood_boost → ${mood}`);

				const onDone = async () => {
					let ytQuery = "";
					switch (mood) {
						case "happy":
							ytQuery = "happy upbeat music playlist";
							break;
						case "sad":
							ytQuery = "uplifting songs for when you're sad";
							break;
						case "angry":
							ytQuery = "calming relaxing music for anger";
							break;
						case "stressed":
							ytQuery = "meditation relaxing music stress relief";
							break;
						case "chill":
						case "relax":
							ytQuery = "lofi chill relax beats playlist";
							break;
						default:
							ytQuery = `${mood} music playlist`;
					}

					// Open YouTube first
					window.open(
						`https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`,
						"_blank"
					);

					// And a helpful Google result as a side option
					const tipsLink =
						(await googleSearchTopLink(`quick tips to feel ${mood}`)) ||
						(await googleSearchTopLink(`how to feel ${mood}`));
					if (tipsLink) window.open(tipsLink, "_blank");

					finishTask();
				};

				const msg = `Sure Sir, I’ll try to help you feel ${mood}. Let’s play something for you.`;
				pushAssistant(msg);
				speak(msg, onDone);
				return;
			}

			if (intent === "open_software") {
				const softwareName = normTarget || q;
				setStatus(`Executing: open_software → ${softwareName}`);
				const onDone = async () => {
					try {
						const res = await fetch(`${API_BASE}/open-software`, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ softwareName }),
						});
						const data = await res.json();

						if (data.success) {
							pushAssistant(`Opened ${softwareName}.`);
							speak(`Opened ${softwareName}.`, finishTask);
						} else {
							pushAssistant(`Could not open ${softwareName}. Searching Google instead.`);
							speak(`Could not open ${softwareName}. Searching Google instead.`, async () => {
								const link = await googleSearchTopLink(softwareName);
								if (link) window.open(link, "_blank");
								else
									window.open(
										`https://www.google.com/search?q=${encodeURIComponent(softwareName)}`,
										"_blank"
									);
								finishTask();
							});
						}
					} catch (error) {
						console.error("Error opening software:", error);
						pushAssistant(`There was an error trying to open ${softwareName}. Searching Google instead.`);
						speak(`There was an error trying to open ${softwareName}. Searching Google instead.`, async () => {
							const link = await googleSearchTopLink(softwareName);
							if (link) window.open(link, "_blank");
							else
								window.open(
									`https://www.google.com/search?q=${encodeURIComponent(softwareName)}`,
									"_blank"
								);
							finishTask();
						});
					}
				};
				pushAssistant(`Attempting to open ${softwareName}...`);
				speak(`Attempting to open ${softwareName}...`, onDone);
				return;
			}

			// 🗣️ Chat / default
			if (intent === "chat" || intent === "unknown") {
				const mood = detectMood(transcript || q);
				return handleConversation(transcript || q, mood);
			}

			setStatus("Unknown intent");
			const msg = "Sorry, I didn’t understand that.";
			pushAssistant(msg);
			speak(msg, finishTask);
		} catch (err) {
			console.error("❌ executeCommand error:", err);
			const msg = "Something went wrong.";
			pushAssistant(msg);
			speak(msg, finishTask);
		} finally {
			// ⛑ failsafe — if Mira somehow hangs, reset after 6s
			setTimeout(() => {
				if (isBusyRef.current && !isSpeakingRef.current) {
					finishTask();
				}
			}, 6000);
		}
	};

	// 🎙️ Start recording
	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			audioChunksRef.current = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) audioChunksRef.current.push(event.data);
			};

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
				await sendToSTT(audioBlob);
			};

			mediaRecorder.start();
			setRecording(true);
		} catch (err) {
			console.error("Microphone error:", err);
		}
	};

	// ⏹️ Stop recording
	const stopRecording = () => {
		if (mediaRecorderRef.current) {
			mediaRecorderRef.current.stop();
			setRecording(false);
		}
	};

	// 📤 Send audio to backend /stt
	const sendToSTT = async (audioBlob) => {
		const formData = new FormData();
		formData.append("audio", audioBlob, "speech.webm");

		try {
			const res = await fetch("http://localhost:5000/stt", {
				method: "POST",
				body: formData,
			});
			const data = await res.json();
			setTranscript(data.text);
			console.log(data.text)

			if (data.text) {
				await beginTask("Parsing with Gemini…");
				const parsed = await parseWithGemini(transcript);
				console.log("parsed result", parsed)

				if (parsed.wake) {
					// Only save if Mira actually woke up
					await pushUser(transcript);
					await executeCommand(parsed, transcript);
				} else {
					finishTask();
					return;
				}
			}
		} catch (err) {
			console.error("STT error:", err);
		}
	};

	const beginTask = async (label = "Working…") => {
		isBusyRef.current = true;
		setIsActive(true);
		setStatus(label);
	};

	const finishTask = () => {
		isBusyRef.current = false;
		setStatus("Done. Listening…");
	};

	// ─────────────────────────────
	// UI (chat log + clear removed)
	// ─────────────────────────────
	return (
		<div className="app">
			<div className={`assistant ${isActive ? "glow" : ""}`}>
				<img src={AI} alt="Mira AI Assistant" className="assistant-img" />
			</div>
			<p className="status-text">{status}</p>
			{!isBusyRef.current && (
				<div className="transcript-box">
					{liveTranscript || "…waiting for speech"}
				</div>
			)}
			<div className="actions">
				<button onClick={recording ? stopRecording : startRecording} className="unlock-btn">
					{recording ? "⏹ Stop Recording" : "🎤 Start Recording"}
				</button>
			</div>
			<div className="footnote">
				Mira can offer supportive conversation, but she isn’t a substitute for
				professional help.
			</div>
			<style>{`
        :root { color-scheme: dark; }
        .app { display:flex; flex-direction:column; align-items:center; gap:16px; padding:32px; font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; }
        .assistant { width:160px; height:160px; display:grid; place-items:center; border-radius:9999px; background:#0b1020; transition: box-shadow .25s ease, transform .25s ease; }
        .assistant.glow { box-shadow: 0 0 24px rgba(80,140,255,.75), 0 0 60px rgba(80,140,255,.35); transform: translateY(-2px); }
        .assistant-img { width:120px; height:120px; object-fit:contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,.4)); }
        .status-text { min-height:24px; color:#e6e9f2; background:#11162a; padding:10px 14px; border-radius:10px; }
        .transcript-box { min-height:40px; max-width:800px; width:100%; color:#fff; background:#1a1f33; padding:12px 16px; border-radius:10px; font-size:16px; white-space:pre-wrap; }
        .chat-pane { width:100%; max-width:800px; background:#0f1428; padding:12px; border-radius:12px; display:flex; flex-direction:column; gap:10px; max-height:44vh; overflow:auto; border:1px solid #1f2543; }
        .chat-empty { color:#9aa3c0; font-style:italic; padding:8px; }
        .bubble { display:flex; flex-direction:column; gap:4px; padding:10px 12px; border-radius:12px; }
        .bubble.user { background:#1a244a; align-self:flex-end; }
        .bubble.assistant { background:#162039; align-self:flex-start; }
        .bubble-role { font-size:12px; opacity:.7; }
        .bubble-text { font-size:15px; line-height:1.35; }
        .actions { display:flex; gap:12px; }
        .unlock-btn, .clear-btn { padding:10px 16px; border-radius:12px; border:none; cursor:pointer; font-weight:600; }
        .unlock-btn { background:#2c6dfd; color:white; }
        .clear-btn { background:#2a304a; color:#e6e6f0; }
        .unlock-btn:hover { filter:brightness(1.05); }
        .clear-btn:hover { filter:brightness(1.07); }
        .footnote { max-width:800px; color:#9aa3c0; font-size:12px; text-align:center; }
        body { background:#0a0f1d; margin:0; }
      `}</style>
		</div>
	);
};

export default App;