const { UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { db } = require("../db");
const { respond } = require("../response");

const TABLE = process.env.REGISTRATIONS_TABLE || "nysc-registrations";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return respond(200, {});

  try {
    const { nin, captchaInput, captchaCode, email } = JSON.parse(event.body || "{}");

    if (!nin || !email) return respond(400, { error: "NIN and email are required" });
    if (!/^\d{11}$/.test(nin)) return respond(400, { error: "NIN must be 11 digits" });
    if (!captchaInput || captchaInput.toUpperCase() !== captchaCode?.toUpperCase()) {
      return respond(400, { error: "Invalid CAPTCHA" });
    }

    const existing = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `PROFILE#${email}`, sk: "PROFILE" } }));
    if (!existing.Item) return respond(404, { error: "Profile not found" });

    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { pk: `PROFILE#${email}`, sk: "PROFILE" },
      UpdateExpression: "SET nin = :nin, #s = :status, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":nin": nin,
        ":status": "NIN_VERIFIED",
        ":updatedAt": new Date().toISOString(),
      },
    }));

    return respond(200, { message: "NIN validated successfully" });
  } catch (err) {
    console.error(err);
    return respond(500, { error: "Internal server error" });
  }
};
