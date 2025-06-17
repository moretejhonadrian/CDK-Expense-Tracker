import { DynamoDB } from 'aws-sdk';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const table = process.env.DYNAMODB_TABLE!;
const aesKey = process.env.AES_SECRET_KEY!;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(aesKey), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(aesKey), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

exports.handler = async (event: any) => {
    const dynamo = new DynamoDB.DocumentClient();
    // Example: Encrypt and store data
    const encrypted = encrypt(event.body.data);
    await dynamo.put({
        TableName: table,
        Item: { id: event.body.id, data: encrypted },
    }).promise();
    return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };

    //If you need to set CORS headers in Lambda responses (for Lambda Proxy Integration):
    /*
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify({ message: 'Success' }),
    };*/
};