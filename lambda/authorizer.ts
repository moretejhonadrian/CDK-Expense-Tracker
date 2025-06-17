exports.handler = async (event: any) => {
  const token = event.authorizationToken;
  // Validate token (e.g., JWT from Cognito)
  if (token === 'allow') {
    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{ Action: 'execute-api:Invoke', Effect: 'Allow', Resource: event.methodArn }],
      },
    };
  }
  throw new Error('Unauthorized');
};