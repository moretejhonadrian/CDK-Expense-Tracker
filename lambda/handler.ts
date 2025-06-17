import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: any) => {
  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const name = body.name || 'anonymous';
      const id = uuidv4();

      const params = {
        TableName: process.env.DYNAMODB_TABLE!,
        Item: {
          id,
          name,
          timestamp: new Date().toISOString(),
        },
      };

      await dynamoDb.put(params).promise();

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Data saved to DynamoDB (v2)',
          id,
          name,
        }),
      };

    } else if (event.httpMethod === 'GET') {
      const params = {
        TableName: process.env.DYNAMODB_TABLE!,
      };

      const data = await dynamoDb.scan(params).promise();

      return {
        statusCode: 200,
        body: JSON.stringify({
          items: data.Items || [],
        }),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
