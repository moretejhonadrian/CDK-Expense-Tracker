exports.handler = async (event: any) => {
  const token = event.authorizationToken;

  if (token === 'allow') {
    const methodArn = event.methodArn;

    // Example: arn:aws:execute-api:ap-southeast-2:123456789012:g2i7msj6r5/prod/POST/items
    const arnParts = methodArn.split('/');
    const apiArn = `${arnParts[0]}/${arnParts[1]}`; // arn:aws:execute-api:ap-southeast-2:123456789012:g2i7msj6r5/prod

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: `${apiArn}/*`, // 👈 allow all methods + resources under /prod
        }],
      },
    };
  }

  throw new Error('Unauthorized');
};
