import {Duration, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Key} from 'aws-cdk-lib/aws-kms';
import {Bucket, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {SharedProps} from './SharedProps';
import {ArnPrincipal, PolicyStatement} from 'aws-cdk-lib/aws-iam';

export class DestinationStack extends Stack {

    constructor(scope: Construct, id: string, props: SharedProps & StackProps) {
        super(scope, id, props);

        const destKey = new Key(this, 'key', {
            alias: props.destinationKeyAlias,
            enableKeyRotation: false,
            pendingWindow: Duration.days(7),
            removalPolicy: RemovalPolicy.DESTROY,
        });

        destKey.addToResourcePolicy(new PolicyStatement({
            principals: [
                new ArnPrincipal(`arn:aws:iam::${props.sourceAccount}:role/${props.sourceRoleName}`)
            ],
            actions: [
                "kms:GenerateDataKey",
                "kms:Encrypt"
            ],
            resources: [
                '*'
            ]
        }))

        const destBucket = new Bucket(this, 'bucket', {
            bucketName: props.destinationBucketName,
            encryptionKey: destKey,
            objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
            versioned: true,
            removalPolicy: RemovalPolicy.DESTROY,
            bucketKeyEnabled: true,
        });

        destBucket.addToResourcePolicy(new PolicyStatement({
            principals: [
                new ArnPrincipal(`arn:aws:iam::${props.sourceAccount}:role/${props.sourceRoleName}`)
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
