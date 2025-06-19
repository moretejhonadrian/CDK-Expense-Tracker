import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class JhonAdrianMoreteCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //DynamoDB Table (CDK)
    const table = new dynamodb.Table(this, 'MyTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      tableName: process.env.DYNAMODB_TABLE,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev only!
    });

    //Cognito User Pool (CDK)
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'expense-tracker-UserPool',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
    });

    const userPoolDomain = userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix: 'expensetracker-userpool-domain',
      },
    })
    
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID],
        callbackUrls: ['https://localhost:3000'],
        logoutUrls: ['https://localhost:3000'],
      }
    });

    //CDK Lambda Resource
    const lambdaFn = new lambda.NodejsFunction(this, 'MyLambda', {
      entry: 'lambda/handler.ts',
      handler: 'handler',
      environment: {
        DYNAMODB_TABLE: table.tableName,
        AES_SECRET_KEY: process.env.AES_SECRET_KEY!,
      },
    });
    table.grantReadWriteData(lambdaFn);

    //CDK Authorizer Resource
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // API Gateway (CDK) with CORS
    const api = new apigateway.RestApi(this, 'MyApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:3000'], // restrict here
        allowMethods: apigateway.Cors.ALL_METHODS, // or specify methods
      },
    });

    const resource = api.root.addResource('expenses');
    resource.addMethod('GET', new apigateway.LambdaIntegration(lambdaFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    resource.addMethod('POST', new apigateway.LambdaIntegration(lambdaFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    resource.addMethod('PUT', new apigateway.LambdaIntegration(lambdaFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    resource.addMethod('DELETE', new apigateway.LambdaIntegration(lambdaFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const monthlyTotal = resource.addResource('monthly-total');
    monthlyTotal.addMethod('GET', new apigateway.LambdaIntegration(lambdaFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
  }
}