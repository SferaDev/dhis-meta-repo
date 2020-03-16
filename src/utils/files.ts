import { D2ModelSchemas } from "d2-api";
import fs from "fs-extra";
import path from "path";

export const buildFileName = (model: string, id: string, name: string) => {
    return model + path.sep + `${id}_${name}.json`;
};

export const writeMetadataToFile = async (model: keyof D2ModelSchemas, objects: any[], workingDir: string) => {
    for (const object of objects) {
        const file = buildFileName(model, object.id, object.name);
        fs.outputJSON(workingDir + path.sep + file, object, { spaces: 4 });
    }
};
