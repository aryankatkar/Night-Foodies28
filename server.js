require("dotenv").config();
const http = require("http");
const { handleRequest, initDataStore } = require("./lib/app-handler");

const PORT = Number(process.env.PORT || 3000);

async function start() {
  try {
    await initDataStore();

    const server = http.createServer(async (req, res) => {
      try {
        await handleRequest(req, res);
      } catch (error) {
        console.error("Unhandled request error:", error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ message: "Internal server error." }));
      }
    });

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:");
    console.error(" ", error.message || String(error));
    console.error(
      "\nTip: On Vercel, the app now uses serverless API routes. For persistent data in production, configure MySQL env vars."
    );
    process.exit(1);
  }
}

start();
