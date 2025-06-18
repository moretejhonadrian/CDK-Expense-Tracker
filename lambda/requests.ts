import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

import { encrypt, decrypt } from './aes';

const table = process.env.DYNAMODB_TABLE!;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const postRequest = async (event: any) => {
    const body = JSON.parse(event.body || '{}');
    const { date, category, description, submitted_by } = body;
    
    //const date = new Date().toISOString(),
    
    const id = uuidv4();
    const encryptedDate = encrypt(date);
    const encryptedCategory = encrypt(category);
    const encryptedDescription = encrypt(description);
    const encryptedSubmitted_by = encrypt(submitted_by);

    const params = {
        TableName: table,
        Item: {
          id,
          date: encryptedDate, 
          category: encryptedCategory,
          description: encryptedDescription, 
          submitted_by: encryptedSubmitted_by,
        },
    };

    await dynamoDb.put(params).promise();

    return {
        statusCode: 200,
        body: JSON.stringify(
          {
            message: 'Data saved to DynamoDB (v2)',
            id,
            date: encryptedDate, 
            category: encryptedCategory,
            description: encryptedDescription, 
            submitted_by: encryptedSubmitted_by,
          },
          null,
          2 // <-- pretty print with 2-space indentation
        ),
    };
};

export const getRequest = async (event: any) => {
    const id = event.queryStringParameters?.id;

    if (id) {
        // Fetch specific item by ID
        const params = {
        TableName: table,
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
                    date: decrypt(item.date),
                    category: decrypt(item.category),
                    description: decrypt(item.description),
                    submitted_by: decrypt(item.submitted_by),
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
            TableName: table,
        };

        const data = await dynamoDb.scan(scanParams).promise();
        
        //return in order
        return {
            statusCode: 200,
            body: JSON.stringify({
                items: (data.Items || []).map(item => ({
                    id: item.id,
                    date: decrypt(item.date),
                    category: decrypt(item.category),
                    description: decrypt(item.description),
                    submitted_by: decrypt(item.submitted_by),
                })),},
            null,
            2 // pretty-print
            ),
        };
    }
};

export const putRequest = async (event: any) => {
    const id = event.queryStringParameters?.id;
    const body = JSON.parse(event.body || '{}');
    const { date, category, description, submitted_by } = body;

    const encryptedDate = encrypt(date);
    const encryptedCategory = encrypt(category);
    const encryptedDescription = encrypt(description);
    const encryptedSubmitted_by = encrypt(submitted_by);

    if (!id) {
        return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing ID for update' }),
        };
    }

    const params = {
        TableName: table,
        Key: { id },
        UpdateExpression: 'set #d = :date, category = :cat, description = :desc, submitted_by = :sub',
        ExpressionAttributeNames: {
            '#d': 'date', // 'date' is a reserved word in DynamoDB
        },
        ExpressionAttributeValues: {
            ':date': encryptedDate,
            ':cat': encryptedCategory,
            ':desc': encryptedDescription,
            ':sub': encryptedSubmitted_by,
        },
        ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDb.update(params).promise();

    return {
        statusCode: 200,
        body: JSON.stringify(
          {
            message: 'Item updated',
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
}

export const deleteRequest = async (event: any) => {
    const body = JSON.parse(event.body || '{}');
    const id = event.queryStringParameters?.id;

    if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Missing ID for deletion' }),
        };
    }

    const params = {
        TableName: table,
        Key: { id },
    };

    await dynamoDb.delete(params).promise();

    return {
        statusCode: 200,
        body: JSON.stringify({ message: `Item with id ${id} deleted` }, null, 2),
    };
}