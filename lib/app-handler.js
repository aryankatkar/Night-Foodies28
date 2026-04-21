const fs = require("fs");
const path = require("path");
const {
  clearOtp,
  createCustomer,
  findCustomerByPhone,
  getDbKind,
  getOtp,
  initDataStore,
  saveOtp,
} = require("./data-store");

const OTP_VALIDITY_MS = 2 * 60 * 1000;

function isValidPhone(phone) {
  return /^\d{10}$/.test(phone);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", () => reject(new Error("Failed to read request body.")));
  });
}

function contentTypeFor(ext) {
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    default:
      return "text/plain; charset=utf-8";
  }
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Server error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": contentTypeFor(ext) });
    res.end(content);
  });
}

async function handleSendOtp(req, res) {
  let payload;
  try {
    payload = await parseBody(req);
  } catch (error) {
    sendJson(res, 400, { message: error.message });
    return;
  }

  const { phone } = payload;
  if (!isValidPhone(String(phone || ""))) {
    sendJson(res, 400, { message: "Phone number must be 10 digits." });
    return;
  }

  const otp = generateOtp();
  const expiresAt = Date.now() + OTP_VALIDITY_MS;

  saveOtp(phone, otp, expiresAt);

  sendJson(res, 200, {
    message: "OTP sent successfully.",
    demoOtp: otp,
    expiresInSeconds: OTP_VALIDITY_MS / 1000,
  });
}

async function handleVerifyOtp(req, res) {
  let payload;
  try {
    payload = await parseBody(req);
  } catch (error) {
    sendJson(res, 400, { message: error.message });
    return;
  }

  const { phone, password, otp } = payload;

  if (!isValidPhone(String(phone || ""))) {
    sendJson(res, 400, { message: "Phone number must be 10 digits." });
    return;
  }

  if (!password || String(password).trim().length < 4) {
    sendJson(res, 400, { message: "Password must be at least 4 characters." });
    return;
  }

  if (!/^\d{6}$/.test(String(otp || ""))) {
    sendJson(res, 400, { message: "OTP must be 6 digits." });
    return;
  }

  const data = getOtp(phone);
  if (!data) {
    sendJson(res, 400, { message: "Please request OTP first." });
    return;
  }

  if (Date.now() > data.expiresAt) {
    clearOtp(phone);
    sendJson(res, 400, { message: "OTP expired. Please request a new OTP." });
    return;
  }

  if (data.otp !== otp) {
    sendJson(res, 401, { message: "Incorrect OTP. Please try again." });
    return;
  }

  clearOtp(phone);
  sendJson(res, 200, { message: "Login successful.", user: { phone } });
}

async function handleSignup(req, res) {
  let payload;
  try {
    payload = await parseBody(req);
  } catch (error) {
    sendJson(res, 400, { message: error.message });
    return;
  }

  const { fullName, phone, email, address, password } = payload;

  if (!fullName || String(fullName).trim().length < 2) {
    sendJson(res, 400, { message: "Full name is required." });
    return;
  }

  if (!isValidPhone(String(phone || ""))) {
    sendJson(res, 400, { message: "Phone number must be 10 digits." });
    return;
  }

  if (!password || String(password).trim().length < 4) {
    sendJson(res, 400, { message: "Password must be at least 4 characters." });
    return;
  }

  try {
    await createCustomer({
      id: `CUS${Date.now()}`,
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      email: String(email || "").trim(),
      address: String(address || "").trim(),
      password: String(password),
      createdAt: new Date().toISOString(),
    });

    const storageMode = getDbKind();
    const message =
      storageMode === "memory"
        ? "Sign Up successful. Note: production data is temporary until MySQL is configured."
        : "Sign Up successful. Now click Login.";

    sendJson(res, 201, { message });
  } catch (error) {
    if (error.code === "DUPLICATE_PHONE") {
      sendJson(res, 409, { message: "Account already exists. Please Login." });
      return;
    }

    console.error("Signup error:", error);
    sendJson(res, 500, { message: "Internal server error." });
  }
}

async function handleLogin(req, res) {
  let payload;
  try {
    payload = await parseBody(req);
  } catch (error) {
    sendJson(res, 400, { message: error.message });
    return;
  }

  const { phone, password } = payload;

  if (!isValidPhone(String(phone || ""))) {
    sendJson(res, 400, { message: "Phone number must be 10 digits." });
    return;
  }

  if (!password) {
    sendJson(res, 400, { message: "Please enter password." });
    return;
  }

  try {
    const customer = await findCustomerByPhone(String(phone).trim());

    if (!customer) {
      sendJson(res, 404, { message: "Account not found. Please Sign Up first." });
      return;
    }

    if (customer.password !== password) {
      sendJson(res, 401, { message: "Incorrect password." });
      return;
    }

    sendJson(res, 200, {
      message: "Login successful.",
      user: { id: customer.id, phone: customer.phone },
    });
  } catch (error) {
    console.error("Login error:", error);
    sendJson(res, 500, { message: "Internal server error." });
  }
}

async function handleApiRequest(req, res, pathname) {
  await initDataStore();

  if (req.method === "POST" && pathname === "/api/auth/send-otp") {
    await handleSendOtp(req, res);
    return true;
  }

  if (req.method === "POST" && pathname === "/api/auth/verify-otp") {
    await handleVerifyOtp(req, res);
    return true;
  }

  if (req.method === "POST" && pathname === "/api/auth/signup") {
    await handleSignup(req, res);
    return true;
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    await handleLogin(req, res);
    return true;
  }

  return false;
}

async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  if (await handleApiRequest(req, res, pathname)) {
    return;
  }

  const safePath = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(safePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(process.cwd(), normalized);
  serveStaticFile(res, filePath);
}

function createServerlessHandler(action) {
  const routePath = `/api/auth/${action}`;

  return async (req, res) => {
    try {
      const handled = await handleApiRequest(req, res, routePath);
      if (!handled) {
        sendJson(res, 404, { message: "Not found." });
      }
    } catch (error) {
      console.error(`Serverless error on ${routePath}:`, error);
      sendJson(res, 500, { message: "Internal server error." });
    }
  };
}

module.exports = {
  createServerlessHandler,
  handleRequest,
  initDataStore,
};
