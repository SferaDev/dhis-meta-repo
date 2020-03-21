import fs from "fs-extra";
import _ from "lodash";
import moment from "moment";
import path from "path";
import tmp from "tmp";
import { getLogger } from "../config/logger";
import { Config, ModelName, StatusFile, UserConfig, WorkingDir } from "../types";

/**
 * @param ModelName: Model name of the objects to store
 * @param any: Object parsed from model
 * @returns File name
 */
export const buildFileName = (model: ModelName, { id, name, level }: any): string => {
    const cleanName = name ? name.split(path.sep).join("-") : undefined;
    const fileName = `${[id, cleanName].join("_")}.json`;
    const orgUnitLevel = level ? `level-${level}` : undefined;
    return _.compact([model, orgUnitLevel, fileName]).join(path.sep);
};

/**
 * @async
 * @param ModelName: Model name of the objects to store
 * @param Object[]: Array of objects parsed by the API
 * @param Config: Application configuration
 * @returns Nothing
 */
export const writeMetadataToFile = async (
    model: ModelName,
    objects: object[],
    { workingDirPath }: Config
) => {
    for (const object of objects) {
        const file = buildFileName(model, object);
        fs.outputJSON(workingDirPath + path.sep + file, object, { spaces: 4 });
    }
};

/**
 * @param UserConfig: Configuration read from a JSON file and extended with default values
 * @returns Temporal folder path and remove callback
 */
export const createWorkingDir = ({ debug }: UserConfig): WorkingDir => {
    const { name, removeCallback } = tmp.dirSync({ keep: debug });
    getLogger("Files").debug(`Working dir: ${name}`);
    return { workingDirPath: name, removeTemporalFolder: removeCallback };
};

/**
 * @param WorkingDir: Temporal working directory
 * @param UserConfig: Configuration read from a JSON file and extended with default values
 * @returns Contents of status file
 */
export const getStatusFile = (
    { workingDirPath }: WorkingDir,
    { statusFileName }: UserConfig
): StatusFile => {
    const statusFilePath = workingDirPath + path.sep + statusFileName;
    fs.ensureFileSync(statusFilePath);
    return fs.readJSONSync(statusFilePath, { throws: false }) ?? {};
};

/**
 * @description Stores the last updated date in the status file
 * @param Config: Application configuration
 * @returns Nothing
 */
export const updateLastUpdated = ({ workingDirPath, statusFileName }: Config) => {
    const statusFilePath = workingDirPath + path.sep + statusFileName;
    fs.ensureFileSync(statusFilePath);
    fs.writeJSON(statusFilePath, { lastUpdated: moment().toISOString() }, { spaces: 4 });
};
