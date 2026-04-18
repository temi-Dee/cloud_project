const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "*";

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

module.exports = { respond };
