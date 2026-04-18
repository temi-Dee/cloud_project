const { UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { db } = require("../db");
const { respond } = require("../response");

const TABLE = process.env.REGISTRATIONS_TABLE || "nysc-registrations";
const BUCKET = process.env.BIOMETRICS_BUCKET || "nysc-biometrics";
const s3 = new S3Client({ region: process.env.AWS_REGION || "eu-west-1" });

// GET /biometrics/upload-url?type=thumb_left|thumb_right|face&id=registrationId
exports.getUploadUrl = async (event) => {
  if (event.httpMethod === "OPTIONS") return respond(200, {});
  const { type, id } = event.queryStringParameters || {};
  if (!type || !id) return respond(400, { error: "type and id are required" });

  const key = `biometrics/${id}/${type}.bin`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: "application/octet-stream" }),
    { expiresIn: 300 }
  );
  return respond(200, { uploadUrl, key });
};

// POST /biometrics
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return respond(200, {});

  try {
    const { email, thumbprintLeft, thumbprintRight, faceCapture } = JSON.parse(event.body || "{}");

    if (!email) return respond(400, { error: "Email is required" });
    if (!thumbprintLeft || !thumbprintRight || !faceCapture) {
      return respond(400, { error: "All biometrics must be captured before submitting" });
    }

    const existing = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `PROFILE#${email}`, sk: "PROFILE" } }));
    if (!existing.Item) return respond(404, { error: "Profile not found" });

    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { pk: `PROFILE#${email}`, sk: "PROFILE" },
      UpdateExpression: "SET biometrics = :bio, #s = :status, completedAt = :completedAt",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":bio": { thumbprintLeft: true, thumbprintRight: true, faceCapture: true },
        ":status": "REGISTRATION_COMPLETE",
        ":completedAt": new Date().toISOString(),
      },
    }));

    return respond(200, { message: "Registration complete", status: "REGISTRATION_COMPLETE" });
  } catch (err) {
    console.error(err);
    return respond(500, { error: "Internal server error" });
  }
};
