export interface MetadataChange {
    model: string;
    id: string;
    name: string;
    level: number;
    lastUpdated?: Date;
    lastUpdatedBy?: {
        id: string;
        name: string;
        userCredentials: {
            username: string;
        };
    };
}

export interface Config {
    debug: boolean;
    baseUrl: string;
    dhisUsername: string;
    dhisPassword: string;
    gitRepo?: string;
    gitBranch: string;
    statusFileName: string;
    publicKey?: string;
    privateKey?: string;
    passphrase: string;
    commiterName: string;
    commiterEmail: string;
    temporal: boolean;
    hideAuthor: boolean;
    pushToRemote: boolean;
    loggerLevel: "trace" | "debug" | "info" | "error" | "fatal";
    loggerFileName: string;
}
