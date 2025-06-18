import { postRequest, getRequest, putRequest, deleteRequest } from './requests';

export const handler = async (event: any) => {
  try {
    if (event.httpMethod === 'POST') {
      return await postRequest(event);
    } else if (event.httpMethod === 'GET') {
      return await getRequest(event);
    } else if (event.httpMethod === 'PUT') {
      return await putRequest(event);
    } else if (event.httpMethod === 'DELETE') {
      return await deleteRequest(event);
    }

    return {
      statusCode: 405,
      headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000',
          'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};