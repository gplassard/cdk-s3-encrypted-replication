export interface SharedProps {
    firstDeployment: boolean

    destinationAccount: string
    destinationBucketName: string
    destinationKeyAlias: string

    sourceAccount: string
    sourceBucketName: string
    sourceKeyAlias: string
    sourceRoleName: string
}
