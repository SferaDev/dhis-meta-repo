import fs from "fs-extra";
import _ from "lodash";
import { initializeApi } from "../api/common";
import { createWorkingDir, getStatusFile } from "../io/files";
import { Config, UserConfig } from "../types";

const buildExternalConfig = (configFilePath: string): UserConfig => {
    const configFileContents = fs.readJSONSync(configFilePath, { throws: false }) ?? {};
    const get = (path: string | string[], defaultValue?: any) =>
        _.get(configFileContents, path, defaultValue);

    return {
        debug: get("debug", true),
        baseUrl: get("dhis.baseUrl", "http://play.dhis2.org/demo"),
        dhisUsername: get("dhis.username", "admin"),
        dhisPassword: get("dhis.password", "district"),
        gitRepo: get("repo.url", undefined),
        gitBranch: get("repo.branch", "master"),
        statusFileName: get("repo.statusFileName", ".meta-repo.json"),
        publicKey: get("repo.ssh.publicKey", undefined),
        privateKey: get("repo.ssh.privateKey", undefined),
        passphrase: get("repo.ssh.passphrase", undefined),
        commiterName: get("repo.commiter.name", "DHIS Meta Repo"),
        commiterEmail: get("repo.commiter.email", "meta-repo@dhis"),
        temporal: get("repo.temporal", true),
        hideAuthor: get("repo.hideAuthor", false),
        ignoreHistory: get("repo.ignoreHistory", false),
        pushToRemote: get("repo.pushToRemote", true),
        loggerLevel: get("logger.level", "debug"),
        loggerFileName: get("logger.fileName", "debug.log"),
        metadataExcludedModels: get("metadata.exclusions", []),
        metadataIncludedModels: get("metadata.inclusions", undefined),
        metadataSpecialModels: get("metadata.special", ["organisationUnits"]),
    };
};

export const buildConfig = (configFilePath: string): Config => {
    const userConfig = buildExternalConfig(configFilePath);

    // Set up connection with DHIS2
    const api = initializeApi(userConfig);

    // Create temporal folder to store repository
    const { name: workingDirPath, removeCallback: removeTemporalFolder } = createWorkingDir(
        userConfig
    );

    // Get lastUpdated date
    const { lastUpdated } = getStatusFile(workingDirPath, userConfig);

    return {
        ...userConfig,
        api,
        workingDirPath,
        removeTemporalFolder,
        lastUpdated,
    };
};