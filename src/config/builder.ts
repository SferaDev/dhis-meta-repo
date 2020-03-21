import fs from "fs-extra";
import _ from "lodash";
import { initializeApi } from "../api";
import { createWorkingDir, getStatusFile } from "../io/files";
import { cloneRepo } from "../io/git";
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

export const buildConfig = async (configFilePath: string): Promise<Config> => {
    const userConfig = buildExternalConfig(configFilePath);
    const workingDir = createWorkingDir(userConfig);
    const statusFile = getStatusFile(workingDir, userConfig);
    const api = initializeApi(userConfig);
    const repo = await cloneRepo(workingDir, userConfig);

    return {
        ...userConfig,
        ...statusFile,
        ...workingDir,
        api,
        repo,
    };
};
