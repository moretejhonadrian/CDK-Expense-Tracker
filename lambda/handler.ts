import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: any) => {
  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const id = uuidv4();
      const date = body.date;
      const category = body.category;
      const description = body.description;
      const submitted_by = body.submitted_by;

      const params = {
        TableName: process.env.DYNAMODB_TABLE!,
        Item: {
          id,
          date,
          category,
          description, //new Date().toISOString(),
          submitted_by,
        },
      };

      await dynamoDb.put(params).promise();

      return {
        statusCode: 200,
        body: JSON.stringify(
          {
            message: 'Data saved to DynamoDB (v2)',
            id,
            date,
            category,
            description, 
            submitted_by,
          },
          null,
          2 // <-- pretty print with 2-space indentation
        ),
      };

    } else if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters?.id;

      if (id) {
        // Fetch specific item by ID
        const params = {
          TableName: process.env.DYNAMODB_TABLE!,
          Key: { id },
        };

        const result = await dynamoDb.get(params).promise();

        if (result.Item) {
          const item = result.Item;
          return {
            statusCode: 200,
            body: JSON.stringify(
              {
                id: item.id,
                date: item.date,
                category: item.category,
                description: item.description,
                submitted_by: item.submitted_by,
              },
              null,
              2
            ),
          };
        } else {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: "Item not found" }, null, 2),
          };
        }
      } else {
        // Return all items
        const scanParams = {
          TableName: process.env.DYNAMODB_TABLE!,
        };

        const data = await dynamoDb.scan(scanParams).promise();

        return {
          statusCode: 200,
          body: JSON.stringify(
            {
              items: (data.Items || []).map(item => ({
                id: item.id,
                date: item.date,
                category: item.category,
                description: item.description,
                submitted_by: item.submitted_by,
              })),
            },
            null,
            2 // pretty-print
          ),
        };
      }
    } else if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, date, category, description, submitted_by } = body;

      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Missing ID for update' }),
        };
      }

      const params = {
        TableName: process.env.DYNAMODB_TABLE!,
        Key: { id },
        UpdateExpression: 'set #d = :date, category = :cat, description = :desc, submitted_by = :sub',
        ExpressionAttributeNames: {
          '#d': 'date', // 'date' is a reserved word in DynamoDB
        },
        ExpressionAttributeValues: {
          ':date': date,
          ':cat': category,
          ':desc': description,
          ':sub': submitted_by,
        },
        ReturnValues: 'ALL_NEW',
      };

      const result = await dynamoDb.update(params).promise();

      return {
        statusCode: 200,
        body: JSON.stringify(
          {
            message: 'Item updated',
            item: result.Attributes,
          },
          null,
          2
        ),
      };
    } else if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      const id = body.id;

      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Missing ID for deletion' }),
        };
      }

      const params = {
        TableName: process.env.DYNAMODB_TABLE!,
        Key: { id },
      };

      await dynamoDb.delete(params).promise();

      return {
        statusCode: 200,
        body: JSON.stringify({ message: `Item with id ${id} deleted` }, null, 2),
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
