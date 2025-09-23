const WebSocket = require("ws");

let wss;
const userSockets = new Map();

function initWebSocket(server) {
  wss = new WebSocket.Server({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const token = url.searchParams.get("token");

      if (!token) return ws.close();

      // replace with your JWT decode
      const userId = decodeToken(token).userId;
      userSockets.set(userId, ws);

      ws.on("close", () => userSockets.delete(userId));
    });
  });
}

function sendTipUpdate(userId, tip) {
  const ws = userSockets.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ tip }));
  }
}

module.exports = { initWebSocket, sendTipUpdate };
