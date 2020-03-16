import { D2ModelSchemas } from "d2-api";
import fs from "fs-extra";
import moment from "moment";
import path from "path";
import tmp from "tmp";
import { Config } from "../types";
import { getLogger } from "./logger";

export const buildFileName = (model: string, id: string, name: string) => {
    return model + path.sep + `${id}_${name}.json`;
};

export const writeMetadataToFile = async (
    model: keyof D2ModelSchemas,
    objects: any[],
    workingDir: string
) => {
    for (const object of objects) {
        const file = buildFileName(model, object.id, object.name);
        fs.outputJSON(workingDir + path.sep + file, object, { spaces: 4 });
    }
};

export const createWorkingDir = ({ debug }: Config) => {
    const workingDir = tmp.dirSync({ keep: debug });
    getLogger("Files").debug(`Working dir: ${workingDir.name}`);
    return workingDir;
};

export const getStatusFile = (workingDirPath: string, { statusFileName }: Config) => {
    const statusFilePath = workingDirPath + path.sep + statusFileName;
    fs.ensureFileSync(statusFilePath);
    return fs.readJSONSync(statusFilePath, { throws: false }) ?? {};
};

export const updateLastUpdated = (workingDirPath: string, { statusFileName }: Config) => {
    const statusFilePath = workingDirPath + path.sep + statusFileName;
    fs.ensureFileSync(statusFilePath);
    fs.writeJSON(statusFilePath, { lastUpdated: moment().toISOString() }, { spaces: 4 });
};
