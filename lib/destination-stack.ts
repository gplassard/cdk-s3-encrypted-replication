import {Duration, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Key} from 'aws-cdk-lib/aws-kms';
import {Bucket, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {DestinationConfig, SourceConfig} from './SharedProps';
import {ArnPrincipal, PolicyStatement} from 'aws-cdk-lib/aws-iam';

export interface DestinationStackProps {
    sources: SourceConfig[]
    destination: DestinationConfig
}
export class DestinationStack extends Stack {

    constructor(scope: Construct, id: string, props: DestinationStackProps & StackProps) {
        super(scope, id, props);

        const destKey = new Key(this, 'key', {
            alias: props.destination.keyAlias,
            enableKeyRotation: false,
            pendingWindow: Duration.days(7),
            removalPolicy: RemovalPolicy.DESTROY,
        });

        for (const source of props.sources) {
            destKey.addToResourcePolicy(new PolicyStatement({
                principals: [
                    new ArnPrincipal(`arn:aws:iam::${source.accountId}:role/${source.replicationRoleName}`)
                ],
                actions: [
                    "kms:GenerateDataKey",
                    "kms:Encrypt"
                ],
                resources: [
                    '*'
                ]
            }))
        }


        const destBucket = new Bucket(this, 'bucket', {
            bucketName: props.destination.bucketName,
            encryptionKey: destKey,
            objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
            versioned: true,
            removalPolicy: RemovalPolicy.DESTROY,
            bucketKeyEnabled: true,
        });

        for (const source of props.sources) {
            destBucket.addToResourcePolicy(new PolicyStatement({
                principals: [
                    new ArnPrincipal(`arn:aws:iam::${source.accountId}:role/${source.replicationRoleName}`)
                ],
                actions: [
                    "s3:ReplicateObject",
                    "s3:ReplicateTags",
                    "s3:ObjectOwnerOverrideToBucketOwner"
                ],
                resources: [
                    destBucket.arnForObjects('*')
                ]
            }))
        }

    }
}
