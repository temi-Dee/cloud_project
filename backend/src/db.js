const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const config = { region: process.env.AWS_REGION || "eu-west-1" };
if (process.env.DYNAMODB_ENDPOINT) {
  config.endpoint = process.env.DYNAMODB_ENDPOINT;
  config.credentials = { accessKeyId: "local", secretAccessKey: "local" };
}

const client = new DynamoDBClient(config);
const db = DynamoDBDocumentClient.from(client);

module.exports = { db };
