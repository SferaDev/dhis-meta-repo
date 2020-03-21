import { D2Api } from "d2-api";
import { Repository } from "nodegit";

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
