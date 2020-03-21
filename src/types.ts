import { D2Api, D2ModelSchemas, Model } from "d2-api";
import { Repository } from "nodegit";

export type ModelName = keyof D2ModelSchemas;
export interface ModelCollection {
    [key: string]: Model<ModelName> | undefined;
}

export interface MetadataChange {
    model: ModelName;
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
    metadataExcludedModels?: ModelName[];
    metadataIncludedModels?: ModelName[];
    metadataSpecialModels?: ModelName[];
}

export interface StatusFile {
    lastUpdated?: string;
}

export interface WorkingDir {
    workingDirPath: string;
    removeTemporalFolder: () => void;
}

export interface AppState {
    api: D2Api;
    repo: Repository;
}

export type Config = UserConfig & StatusFile & WorkingDir & AppState;
