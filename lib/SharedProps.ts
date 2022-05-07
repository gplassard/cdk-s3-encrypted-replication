export interface SourceConfig {
    firstDeployment: boolean
    accountId: string
    bucketName: string
    keyAlias: string
    replicationRoleName: string
}

export interface DestinationConfig {
    accountId: string
    bucketName: string
    keyAlias: string
}

