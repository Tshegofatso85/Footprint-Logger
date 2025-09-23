require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");

const authRoutes = require("./routes/auth");
const activitiesRoutes = require("./routes/activities");
const authenticate = require("./middleware/auth");
const WebSocket = require("ws");

const wss = new WebSocket.Server({ noServer: true });
const userSockets = new Map(); // Map userId -> ws

const { initWebSocket } = require("./utils/ws");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// HTTP server
const server = http.createServer(app);
initWebSocket(server);

// connect to MongoDB
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/footprintdb";
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Mongo connected"))
  .catch((err) => {
    console.error("Mongo connection error:", err);
    process.exit(1);
  });

// API
app.use("/api/auth", authRoutes);
app.use("/api/activities", authenticate, activitiesRoutes);

// optionally: some public endpoints (e.g. community average and leaderboard) without auth
//app.get(
//  "/api/public/community-average",
//  require("./routes/activities").communityAverage
//); // alternative: export function
// but simpler: keep community and leaderboard behind auth for now (or duplicate as public if you want)

// Serve static frontend files. You uploaded a basic UI (index.html, script.js, style.css)
// If you place them in a /public folder, Express can serve them. We'll assume you put the files in ./public
app.use(express.static(path.join(__dirname, "public")));

// for SPA fallback:
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Upgrade HTTP server to handle WebSocket
app.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    // Assume token is passed as query ?token=...
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) return ws.close();
    // Decode token to get userId (simplified, depends on your auth)
    const userId = decodeToken(token).userId;
    userSockets.set(userId, ws);

    ws.on("close", () => userSockets.delete(userId));
  });
});

// // Function to send tip update to a user
// function sendTipUpdate(userId, tip) {
//   const ws = userSockets.get(userId);
//   if (ws && ws.readyState === WebSocket.OPEN) {
//     ws.send(JSON.stringify({ tip }));
//   }
// }

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
