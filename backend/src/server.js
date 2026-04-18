const http = require("http");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

// Point to local DynamoDB when running in Docker
if (process.env.DYNAMODB_ENDPOINT) {
  process.env.AWS_ENDPOINT_URL_DYNAMODB = process.env.DYNAMODB_ENDPOINT;
}

const { handler: profileHandler } = require("./handlers/profile");
const { handler: registrationHandler } = require("./handlers/registration");
const { handler: lookupHandler } = require("./handlers/lookup");
const { handler: biometricsHandler, getUploadUrl } = require("./handlers/biometrics");

const PORT = process.env.PORT || 3000;

const routes = {
  "POST /profile":              profileHandler,
  "POST /registration":         registrationHandler,
  "POST /lookup":               lookupHandler,
  "POST /biometrics":           biometricsHandler,
  "GET /biometrics/upload-url": getUploadUrl,
};

const server = http.createServer(async (req, res) => {
  const chunks = [];
  req.on("data", c => chunks.push(c));
  req.on("end", async () => {
    const body = Buffer.concat(chunks).toString();
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const routeKey = `${req.method} ${url.pathname}`;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

    if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

    const handler = routes[routeKey];
    if (!handler) { res.writeHead(404); res.end(JSON.stringify({ error: "Not found" })); return; }

    const queryStringParameters = Object.fromEntries(url.searchParams.entries());
    const event = { httpMethod: req.method, body, queryStringParameters, headers: req.headers };

    try {
      const result = await handler(event);
      res.writeHead(result.statusCode, result.headers || { "Content-Type": "application/json" });
      res.end(result.body);
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });
});

server.listen(PORT, () => console.log(`NYSC Backend running on http://localhost:${PORT}`));
