import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import { createBareServer } from "@tomphttp/bare-server-node";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "8080", 10);

const app = express();
const bare = createBareServer("/bare/");

app.disable("x-powered-by");

// Optional cross-origin isolation headers. Off by default because COEP
// blocks third-party iframes (games, embeds). Enable with ISOLATE=1 only if
// your transport needs SharedArrayBuffer.
if (process.env.ISOLATE === "1") {
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });
}

// The service worker must be able to control the whole origin.
app.get("/sw.js", (req, res, next) => {
  res.setHeader("Service-Worker-Allowed", "/");
  res.setHeader("Cache-Control", "no-cache");
  next();
});

// Our own files first (public/uv/uv.config.js lives here), then the UV
// bundle/handler/client/sw files shipped by the Ultraviolet package.
app.use(express.static(join(__dirname, "public")));
app.use("/uv/", express.static(uvPath));

app.use((req, res) => {
  res.status(404).sendFile(join(__dirname, "public", "index.html"));
});

const server = createServer();

server.on("request", (req, res) => {
  if (bare.shouldRoute(req)) bare.routeRequest(req, res);
  else app(req, res);
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) bare.routeUpgrade(req, socket, head);
  else socket.end();
});

server.on("listening", () => {
  console.log(`Blue Cola is running on http://localhost:${PORT}`);
});

function shutdown(signal) {
  console.log(`\n${signal} received, shutting down...`);
  server.close(() => {
    bare.close();
    process.exit(0);
  });
  // Force exit if connections hang around.
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen({ port: PORT, host: "0.0.0.0" });
