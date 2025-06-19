import { postRequest, getRequest, putRequest, deleteRequest, getMonthlyTotal } from './requests';

export const handler = async (event: any) => {
  try {
    const path = event.path;
    const method = event.httpMethod;

    //route specifically for expenses/monthly-total
    if (path === '/expenses/monthly-total' && method === 'GET') {
      return await getMonthlyTotal(event);
    }

    if (path.includes('/expenses')) {
      if (method === 'POST') return await postRequest(event);
      if (method === 'GET') return await getRequest(event);
      if (method === 'PUT') return await putRequest(event);
      if (method === 'DELETE') return await deleteRequest(event);
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