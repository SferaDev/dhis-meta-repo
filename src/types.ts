import { D2Api } from "d2-api";

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

export interface UserConfig {
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
    ignoreHistory: boolean;
    pushToRemote: boolean;
    loggerLevel: "trace" | "debug" | "info" | "error" | "fatal";
    loggerFileName: string;
    metadataExcludedModels?: string[];
    metadataIncludedModels?: string[];
    metadataSpecialModels?: string[];
}

export interface Config extends UserConfig {
    api: D2Api;
    workingDirPath: string;
    removeTemporalFolder: () => void;
    lastUpdated?: string;
}
