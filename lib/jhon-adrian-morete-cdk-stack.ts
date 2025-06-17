import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class JhonAdrianMoreteCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'JhonAdrianMoreteCdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    //DynamoDB Table (CDK)
    const table = new dynamodb.Table(this, 'MyTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      tableName: process.env.DYNAMODB_TABLE,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev only!
    });

    //Cognito User Pool (CDK)
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
    });
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
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
    const authorizerFn = new lambda.NodejsFunction(this, 'AuthorizerFn', {
      entry: 'lambda/authorizer.ts',
    });

    const authorizer = new apigateway.TokenAuthorizer(this, 'LambdaAuthorizer', {
      handler: authorizerFn,
    });

    // API Gateway (CDK) with CORS
    const api = new apigateway.RestApi(this, 'MyApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const resource = api.root.addResource('items');
    resource.addMethod('GET', new apigateway.LambdaIntegration(lambdaFn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    resource.addMethod('POST', new apigateway.LambdaIntegration(lambdaFn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    resource.addMethod('PUT', new apigateway.LambdaIntegration(lambdaFn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    resource.addMethod('DELETE', new apigateway.LambdaIntegration(lambdaFn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
  }
}