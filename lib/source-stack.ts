import {Duration, RemovalPolicy, ScopedAws, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Key} from 'aws-cdk-lib/aws-kms';
import {Bucket, CfnBucket, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {PolicyDocument, PolicyStatement, Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import {SharedProps} from './SharedProps';


export class SourceStack extends Stack {

  constructor(scope: Construct, id: string, props: SharedProps & StackProps) {
    super(scope, id, props);

    const sourceKey = new Key(this, 'key', {
      alias: props.sourceKeyAlias,
      enableKeyRotation: false,
      pendingWindow: Duration.days(7),
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const sourceBucket = new Bucket(this, 'bucket', {
      bucketName: props.sourceBucketName,
      encryptionKey: sourceKey,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      bucketKeyEnabled: true,
    });

    const replicationRole = new Role(this, 'replicationRole', {
      roleName: props.sourceRoleName,
      assumedBy: new ServicePrincipal('s3.amazonaws.com'),
      inlinePolicies: {
        'replication-rights': new PolicyDocument({
          statements: [
              new PolicyStatement({
                actions: [
                  "s3:GetReplicationConfiguration",
                  "s3:ListBucket"
                ],
                resources: [
                    sourceBucket.bucketArn
                ]
              }),
              new PolicyStatement({
                actions: [
                  's3:GetObjectVersion',
                  's3:GetObjectVersionAcl',
                  's3:GetObjectVersionForReplication',
                  's3:GetObjectVersionTagging'
                ],
                resources: [
                    sourceBucket.arnForObjects('*')
                ]
              }),
              new PolicyStatement({
                actions: [
                  'kms:Decrypt',
                ],
                resources: [
                    sourceKey.keyArn
                ]
              })
          ]
        })
      }
    });

    const cfnBucket = sourceBucket.node.defaultChild as CfnBucket;
    cfnBucket.replicationConfiguration = {
      role: `arn:aws:iam::${this.account}:role/${props.sourceRoleName}`,
      rules: [
        {
          id: 'replication',
          status: 'Enabled',
          destination: {
            bucket: `arn:aws:s3:::${props.destinationBucketName}`,
            account: props.destinationAccount,
            encryptionConfiguration: {
              replicaKmsKeyId: `arn:aws:kms:${this.region}:${this.account}:alias/${props.destinationKeyAlias}`
            }
          },
          sourceSelectionCriteria: {
            sseKmsEncryptedObjects: {
              status: 'Enabled'
            }
          }
        }
      ]
    }

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CdkS3EncryptedReplicationQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
