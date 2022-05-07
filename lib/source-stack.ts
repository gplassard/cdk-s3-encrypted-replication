import {Duration, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Key} from 'aws-cdk-lib/aws-kms';
import {Bucket, CfnBucket, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {PolicyDocument, PolicyStatement, Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import {DestinationConfig, SourceConfig} from './SharedProps';
import {Trail} from 'aws-cdk-lib/aws-cloudtrail';
import {Topic} from 'aws-cdk-lib/aws-sns';

export interface SourceStackProps {
  source: SourceConfig
  destination: DestinationConfig
}
export class SourceStack extends Stack {

  constructor(scope: Construct, id: string, props: SourceStackProps & StackProps) {
    super(scope, id, props);

    const sourceKey = new Key(this, 'key', {
      alias: props.source.keyAlias,
      enableKeyRotation: false,
      pendingWindow: Duration.days(7),
      removalPolicy: RemovalPolicy.DESTROY,
    });

    sourceKey.addToResourcePolicy(new PolicyStatement({
      principals: [
        new ServicePrincipal("cloudtrail.amazonaws.com")
      ],
      actions: [
        "kms:Decrypt",
        "kms:DescribeKey",
        "kms:GenerateDataKey*",
        "kms:Encrypt"
      ],
      resources: [
        '*'
      ]
    }));

    sourceKey.addToResourcePolicy(new PolicyStatement({
      principals: [
        new ServicePrincipal("sns.amazonaws.com")
      ],
      actions: [
        "kms:GenerateDataKey*",
        "kms:Encrypt",
        "kms:Decrypt",
      ],
      resources: [
        '*'
      ]
    }));

    const sourceBucket = new Bucket(this, 'bucket', {
      bucketName: props.source.bucketName,
      encryptionKey: sourceKey,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      bucketKeyEnabled: true,
    });

    const replicationRole = new Role(this, 'replicationRole', {
      roleName: props.source.replicationRoleName,
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

    if (!props.source.firstDeployment) {
      // the source stack has to be deployed before the destination stack, because the destination stack references the replication role
      // but the replication configuration can't be deployed before the destination bucket & the kms key exist
      // so deploy the source stack without replication, then the destination stack, and redeploy the source stack with replication
      const cfnBucket = sourceBucket.node.defaultChild as CfnBucket;
      cfnBucket.replicationConfiguration = {
        role: `arn:aws:iam::${this.account}:role/${props.source.replicationRoleName}`,
        rules: [
          {
            id: 'replication',
            status: 'Enabled',
            destination: {
              bucket: `arn:aws:s3:::${props.destination.bucketName}`,
              account: props.destination.accountId,
              encryptionConfiguration: {
                replicaKmsKeyId: `arn:aws:kms:${this.region}:${props.destination.accountId}:alias/${props.destination.keyAlias}`
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
    }

    const topic = new Topic(this, 'topic', {
      masterKey: sourceKey,
    });

    const trail = new Trail(this, 'trail', {
      bucket: sourceBucket,
      encryptionKey: sourceKey,
      enableFileValidation: true,
      isMultiRegionTrail: true,
      trailName: 'trail',
      includeGlobalServiceEvents: true,
      snsTopic: topic,
    });

  }
}
