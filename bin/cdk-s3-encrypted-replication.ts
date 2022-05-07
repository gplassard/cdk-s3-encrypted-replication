#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {SourceStack} from '../lib/source-stack';
import {DestinationStack, DestinationStackProps} from '../lib/destination-stack';

const app = new cdk.App();

export type Config = DestinationStackProps;
const config: Config = {
    sources: [
        {
            accountId: process.env.CDK_DEFAULT_ACCOUNT!,
            replicationRoleName: 'replication-role',
            keyAlias: 'source-key',
            bucketName: 'azertyuiop-source-bucket',
            firstDeployment: false,
        },
        {
            accountId: process.env.CDK_DEFAULT_ACCOUNT!,
            replicationRoleName: 'replication-role-2',
            keyAlias: 'source-key-2',
            bucketName: 'azertyuiop-source-bucket-2',
            firstDeployment: false,
        }
    ],
    destination: {
        bucketName: 'azertyuiop-destination-bucket',
        keyAlias: 'destination-key',
        accountId: process.env.CDK_DEFAULT_ACCOUNT!,
    }
}
for (let i = 0; i < config.sources.length; i++) {
    new SourceStack(app, `source-stack-${i}`, {
        source: config.sources[i],
        destination: config.destination,
        env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    });
}
new DestinationStack(app, 'destinationStack', {
    ...config,
});
