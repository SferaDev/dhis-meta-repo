import fs from "fs-extra";
import _ from "lodash";
import moment from "moment";
import path from "path";
import tmp from "tmp";
import { getLogger } from "../config/logger";
import { Config, UserConfig } from "../types";

export const buildFileName = (model: string, { id, name, level }: any) => {
    const cleanName = name ? name.split(path.sep).join("-") : undefined;
    const fileName = `${[id, cleanName].join("_")}.json`;
    const orgUnitLevel = level ? `level-${level}` : undefined;
    return _.compact([model, orgUnitLevel, fileName]).join(path.sep);
};

export const writeMetadataToFile = async (model: string, objects: any[], workingDir: string) => {
    for (const object of objects) {
        const file = buildFileName(model, object);
        fs.outputJSON(workingDir + path.sep + file, object, { spaces: 4 });
    }
};

export const createWorkingDir = ({ debug }: UserConfig) => {
    const workingDir = tmp.dirSync({ keep: debug });
    getLogger("Files").debug(`Working dir: ${workingDir.name}`);
    return workingDir;
};

export const getStatusFile = (currentDir: string, { statusFileName }: UserConfig) => {
    const statusFilePath = currentDir + path.sep + statusFileName;
    fs.ensureFileSync(statusFilePath);
    return fs.readJSONSync(statusFilePath, { throws: false }) ?? {};
};

export const updateLastUpdated = ({ workingDirPath, statusFileName }: Config) => {
    const statusFilePath = workingDirPath + path.sep + statusFileName;
    fs.ensureFileSync(statusFilePath);
    fs.writeJSON(statusFilePath, { lastUpdated: moment().toISOString() }, { spaces: 4 });
};
