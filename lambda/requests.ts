import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

import { encrypt, decrypt } from './aes';

const table = process.env.DYNAMODB_TABLE!;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const postRequest = async (event: any) => {
    const body = JSON.parse(event.body || '{}');
    const { date, category, amount, description, submitted_by } = body;
    
    //const date = new Date().toISOString(),
    
    const id = uuidv4();
    const encryptedDate = encrypt(date);
    const encryptedCategory = encrypt(category);
    const encryptedAmount = encrypt(amount.toString());
    const encryptedDescription = encrypt(description);
    const encryptedSubmitted_by = encrypt(submitted_by);

    const params = {
        TableName: table,
        Item: {
          id,
          date: encryptedDate, 
          category: encryptedCategory,
          amount: encryptedAmount,
          description: encryptedDescription, 
          submitted_by: encryptedSubmitted_by,
        },
    };

    await dynamoDb.put(params).promise();

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ //all fields inumerated to maintain order
            message: 'Data saved to DynamoDB (v2)',
            id,
            date: date, 
            category: category,
            amount: amount,
            description: description, 
            submitted_by: submitted_by,
            },
            null,
            2 // <-- pretty print with 2-space indentation
        ),
    };
};

export const getRequest = async (event: any) => {
    const id = event.queryStringParameters?.id;

    if (id) {
        return await getRequestID(id);
    } else {
        const month = event.queryStringParameters?.month;
        const category = event.queryStringParameters?.category;

        if (!month && !category) {
            return await getRequestAll(event);
        } else {
            return await getRequestFilter({ month, category });
        }
    }
};

const getRequestID = async (id: string) => {
    // fetch specific item by ID
    const params = {
        TableName: table,
        Key: { id },
    };

    const result = await dynamoDb.get(params).promise();

    if (result.Item) {
        const item = result.Item;
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'http://localhost:3000',
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify(
            {
                id: item.id,
                date: decrypt(item.date),
                category: decrypt(item.category),
                amount: parseFloat(decrypt(item.amount)),
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
            headers: {
                'Access-Control-Allow-Origin': 'http://localhost:3000',
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({ message: "Item not found" }, null, 2),
        };
    }
};

const getRequestAll = async (event: any) => {
    //handle pagination
    const limit = parseInt(event.queryStringParameters?.limit || '5');
    const startKey = event.queryStringParameters?.startKey
        ? JSON.parse(Buffer.from(event.queryStringParameters.startKey, 'base64').toString('utf-8'))
        : undefined;

    const scanParams: AWS.DynamoDB.DocumentClient.ScanInput = {
        TableName: table,
        Limit: limit,
    };

    if (startKey) {
        scanParams.ExclusiveStartKey = startKey;
    }

    const data = await dynamoDb.scan(scanParams).promise();

    const items = (data.Items || []).map(item => ({
        id: item.id,
        date: decrypt(item.date),
        category: decrypt(item.category),
        amount: parseFloat(decrypt(item.amount)),
        description: decrypt(item.description),
        submitted_by: decrypt(item.submitted_by),
    }));

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
            items,
            nextStartKey: data.LastEvaluatedKey
                ? Buffer.from(JSON.stringify(data.LastEvaluatedKey)).toString('base64')
                : null,
        }, null, 2),
    };
};

const getRequestFilter = async ({ month, category }: { month?: string; category?: string }) => {// month: "YYYY-MM"

    const params = {
        TableName: table,
    };

    const data = await dynamoDb.scan(params).promise();

    const items = (data.Items || [])
        .map(item => ({
            id: item.id,
            date: decrypt(item.date),
            category: decrypt(item.category),
            amount: parseFloat(decrypt(item.amount)),
            description: decrypt(item.description),
            submitted_by: decrypt(item.submitted_by),
        }))
        .filter(item => {
            const matchesMonth = month ? item.date.startsWith(month) : true;
            const matchesCategory = category ? item.category === category : true;
            return matchesMonth && matchesCategory; // only filters if param is provided
        });

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ items }, null, 2),
    };
};

export const putRequest = async (event: any) => {
    const id = event.queryStringParameters?.id;
    const body = JSON.parse(event.body || '{}');
    const { date, category, amount, description, submitted_by } = body;

    const encryptedDate = encrypt(date);
    const encryptedCategory = encrypt(category);
    const encryptedAmount = encrypt(amount.toString());
    const encryptedDescription = encrypt(description);
    const encryptedSubmitted_by = encrypt(submitted_by);

    //if no id is provided
    if (!id) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': 'http://localhost:3000',
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({ message: 'Missing ID for update' }),
        };
    }

    const params = {
        TableName: table,
        Key: { id },
        UpdateExpression: 'set #d = :date, category = :cat, amount = :amt, description = :desc, submitted_by = :sub',
        ExpressionAttributeNames: {
            '#d': 'date', // 'date' is a reserved word in DynamoDB
        },
        ExpressionAttributeValues: {
            ':date': encryptedDate,
            ':cat': encryptedCategory,
            ':amt': encryptedAmount,
            ':desc': encryptedDescription,
            ':sub': encryptedSubmitted_by,
        },
        ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDb.update(params).promise();

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
            message: 'Item updated',
            id,
            date,
            category,
            amount,
            description, 
            submitted_by,
            },
            null,
            2 // <-- pretty print with 2-space indentation
        ),
    };
};

export const deleteRequest = async (event: any) => {
    const id = event.queryStringParameters?.id;

    if (!id) {
        return {
            headers: {
                'Access-Control-Allow-Origin': 'http://localhost:3000',
                'Access-Control-Allow-Credentials': true,
            },
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
        headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: `Item with id ${id} deleted` }, null, 2),
    };
};

export const getMonthlyTotal = async (event: any) => {
    const month = event.queryStringParameters?.month; //expected format: "YYYY-MM"

    if (!month) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': 'http://localhost:3000',
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({ message: 'Missing month to total (expected format: YYYY-MM)' }),
        };
    }

    try {
        const params = {
            TableName: table,
        };

        const data = await dynamoDb.scan(params).promise();

        const items = (data.Items || []).map(item => {
            const decryptedDate = decrypt(item.date);
            const decryptedAmount = parseFloat(decrypt(item.amount));

            return {
                ...item,
                date: decryptedDate,
                amount: isNaN(decryptedAmount) ? 0 : decryptedAmount,
            };
        });

        //filter by the specified month
        const filteredItems = items.filter(item => item.date.startsWith(month));

        //sum the amounts
        const total = filteredItems.reduce((sum, item) => sum + item.amount, 0);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'http://localhost:3000',
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({ total }),
        };
    } catch (error) {
        console.error('Error calculating monthly total:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': 'http://localhost:3000',
                'Access-Control-Allow-Credentials': true,
            },
            body: JSON.stringify({ error: 'Failed to calculate monthly total' }),
        };
    }
};
