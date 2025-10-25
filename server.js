import 'dotenv/config'; 
import express from "express";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const TMP_DIR = path.join(os.tmpdir(), "maps-scraper");

// Ensure temp folder exists
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Start HTTP server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// WebSocket setup
const wss = new WebSocketServer({ server });
const clientScrapers = new Map();

wss.on("connection", (ws) => {
  ws.id = Date.now().toString();
  ws.tempFile = null;
  ws.isAlive = true;

  ws.on("pong", () => (ws.isAlive = true));

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return ws.send(
        JSON.stringify({ type: "error", message: "Invalid JSON" })
      );
    }

    const { action, query, type } = data;
    if (type === "ping") return;

    // START scraper
    if (action === "start") {
      if (clientScrapers.has(ws)) {
        return ws.send(
          JSON.stringify({ type: "error", message: "Scraper already running" })
        );
      }

      const url = query.startsWith("http")
        ? query
        : `https://www.google.com/maps/search/${encodeURIComponent(query)}/`;

      const scraper = spawn(
        "node",
        [path.join(__dirname, "scrape-maps.js"), url],
        { stdio: ["ignore", "pipe", "pipe"] }
      );
      clientScrapers.set(ws, scraper);

      scraper.stdout.on("data", (d) =>
        ws.send(JSON.stringify({ type: "log", message: d.toString() }))
      );
      scraper.stderr.on("data", (d) =>
        ws.send(JSON.stringify({ type: "error", message: d.toString() }))
      );

      scraper.on("close", () => {
        ws.send(JSON.stringify({ type: "log", message: "Scraping finished." }));

        const latestFile = fs
          .readdirSync(TMP_DIR)
          .filter((f) => f.endsWith(".csv"))
          .sort(
            (a, b) =>
              fs.statSync(path.join(TMP_DIR, b)).mtime -
              fs.statSync(path.join(TMP_DIR, a)).mtime
          )[0];

        if (latestFile) {
          ws.tempFile = path.join(TMP_DIR, latestFile);
          ws.send(JSON.stringify({ type: "done", file: latestFile }));
        }

        clientScrapers.delete(ws);
      });
    }

    // CANCEL scraper
    if (action === "cancel") {
      const scraper = clientScrapers.get(ws);
      if (scraper) {
        scraper.kill("SIGINT");
        ws.send(JSON.stringify({ type: "log", message: "Scraper cancelled." }));
        clientScrapers.delete(ws);

        if (ws.tempFile && fs.existsSync(ws.tempFile))
          fs.unlinkSync(ws.tempFile);
      } else {
        ws.send(
          JSON.stringify({ type: "log", message: "No active scraper found." })
        );
      }
    }
  });

  ws.on("close", () => {
    const scraper = clientScrapers.get(ws);
    if (scraper) scraper.kill("SIGINT");
    if (ws.tempFile && fs.existsSync(ws.tempFile)) fs.unlinkSync(ws.tempFile);
    clientScrapers.delete(ws);
  });
});

// Keep WebSocket alive
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Download endpoint
app.get("/download/:file", (req, res) => {
  const filePath = path.join(TMP_DIR, req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).send("File not found");

  res.download(filePath, (err) => {
    if (err) console.error("Download error:", err);
    else {
      console.log(`Download started: ${filePath}`);
      setTimeout(
        () => fs.existsSync(filePath) && fs.unlinkSync(filePath),
        5 * 60 * 1000
      );
    }
  });
});
