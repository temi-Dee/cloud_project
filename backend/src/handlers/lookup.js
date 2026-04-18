const { UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { db } = require("../db");
const { respond } = require("../response");

const TABLE = process.env.REGISTRATIONS_TABLE || "nysc-registrations";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return respond(200, {});

  try {
    const { institution, jambReg, state, course, email } = JSON.parse(event.body || "{}");

    if (!institution || !jambReg || !state || !email) {
      return respond(400, { error: "Institution, JAMB number, state and email are required" });
    }
    if (!/^\d{8,10}[A-Za-z]{2}$/.test(jambReg)) {
      return respond(400, { error: "Invalid JAMB registration number format" });
    }

    const existing = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `PROFILE#${email}`, sk: "PROFILE" } }));
    if (!existing.Item) return respond(404, { error: "Profile not found" });

    // In production: call NYSC mobilisation API here
    // For now we store and confirm
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { pk: `PROFILE#${email}`, sk: "PROFILE" },
      UpdateExpression: "SET institution = :inst, jambReg = :jamb, stateOfOrigin = :state, course = :course, #s = :status, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":inst": institution,
        ":jamb": jambReg.toUpperCase(),
        ":state": state,
        ":course": course || "",
        ":status": "MOBILISATION_VERIFIED",
        ":updatedAt": new Date().toISOString(),
      },
    }));

    return respond(200, { message: "Mobilisation confirmed", mobilised: true });
  } catch (err) {
    console.error(err);
    return respond(500, { error: "Internal server error" });
  }
};
