#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {SourceStack} from '../lib/source-stack';
import {DestinationStack} from '../lib/destination-stack';
import {SharedProps} from '../lib/SharedProps';

const app = new cdk.App();

const props: SharedProps = {
    firstDeployment: false,
    destinationAccount: process.env.CDK_DEFAULT_ACCOUNT!,
    destinationBucketName: 'azertyuiop-destination-bucket',
    destinationKeyAlias: 'destination-key',
    sourceAccount: process.env.CDK_DEFAULT_ACCOUNT!,
    sourceBucketName: 'azertyuiop-source-bucket',
    sourceKeyAlias: 'source-key',
    sourceRoleName: 'replication-role'
}

new SourceStack(app, 'sourceStack', {
    ...props,
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
new DestinationStack(app, 'destinationStack', {
    ...props,
});
