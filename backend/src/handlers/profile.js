const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { v4: uuidv4 } = require("uuid");
const { db } = require("../db");
const { respond } = require("../response");

const ses = new SESClient({ region: process.env.AWS_REGION || "eu-west-1" });
const TABLE = process.env.REGISTRATIONS_TABLE || "nysc-registrations";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@nysc.gov.ng";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://nysc.example.com";
const IS_LOCAL = !!process.env.DYNAMODB_ENDPOINT;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return respond(200, {});

  try {
    const body = JSON.parse(event.body || "{}");
    const { firstName, lastName, email, phone, securityQuestion, securityAnswer, registrationType } = body;

    if (!firstName || !lastName || !email || !phone || !securityQuestion || !securityAnswer) {
      return respond(400, { error: "All fields are required" });
    }

    const existing = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: `PROFILE#${email}`, sk: "PROFILE" } }));
    if (existing.Item) return respond(409, { error: "Email already registered" });

    const registrationId = uuidv4();
    const token = uuidv4();
    const createdAt = new Date().toISOString();

    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        pk: `PROFILE#${email}`,
        sk: "PROFILE",
        registrationId,
        firstName, lastName, email, phone,
        securityQuestion, securityAnswer,
        registrationType,
        token,
        status: "PROFILE_CREATED",
        createdAt,
      },
    }));

    if (IS_LOCAL) {
      console.log(`[LOCAL] Skipping SES. Registration link: ${FRONTEND_URL}?token=${token}&step=2`);
      console.log(`[LOCAL] Credentials — Username: ${email} | Password: NYSC_${lastName.toUpperCase()}_2025`);
    } else {
      await ses.send(new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: "NYSC Registration - Complete Your Registration" },
          Body: {
            Html: {
              Data: `
                <h2>Welcome to NYSC Registration Portal, ${firstName}!</h2>
                <p>Click the link below to continue your registration:</p>
                <a href="${FRONTEND_URL}?token=${token}&step=2" style="background:#008751;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
                  Continue Registration
                </a>
                <p>This link expires in 24 hours.</p>
                <p>Your auto-generated credentials:<br/>
                Username: <strong>${email}</strong><br/>
                Password: <strong>NYSC_${lastName.toUpperCase()}_2025</strong></p>
              `
            }
          }
        }
      }));
    }

    return respond(200, { message: "Profile created. Check your email.", registrationId });
  } catch (err) {
    console.error(err);
    return respond(500, { error: "Internal server error" });
  }
};
