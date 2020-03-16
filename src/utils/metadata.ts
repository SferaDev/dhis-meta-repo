import { D2Api, D2ModelSchemas, Pager } from "d2-api";
import log4js from "log4js";
import moment from "moment";
import { MetadataChange } from "../types";
import { writeMetadataToFile } from "./files";

export const fields = {
    $owner: true,
    lastUpdatedBy: {
        id: true,
        name: true,
        userCredentials: { username: true },
    },
};

export const fetchApi = async (
    api: D2Api,
    model: string,
    {
        page = 1,
        pageSize = 10000,
        lastUpdated,
    }: { page?: number; pageSize?: number; lastUpdated?: string }
): Promise<{ objects: any[]; pager: Pager }> => {
    //@ts-ignore
    return api.models[model]
        .get({
            fields,
            paging: true,
            page,
            pageSize,
            filter: lastUpdated
                ? {
                      lastUpdated: {
                          gt: moment(lastUpdated).toISOString(),
                      },
                  }
                : undefined,
        })
        .getData();
};

export const processMetadata = async ({
    api,
    models,
    lastUpdated,
    workingDirPath,
}: {
    api: D2Api;
    models: (keyof D2ModelSchemas)[];
    lastUpdated: string;
    workingDirPath: string;
}) => {
    const items: MetadataChange[] = [];

    for (const model of models) {
        try {
            log4js.getLogger("Metadata").debug(`Fetching model ${model}`);
            let page = 1;
            let pageCount = 1;

            while (page <= pageCount) {
                const { objects, pager } = (await fetchApi(api, model, {
                    page,
                    lastUpdated,
                })) as {
                    objects: any[];
                    pager: Pager;
                };
                page = pager.page + 1;
                pageCount = pager.pageCount;

                writeMetadataToFile(model, objects, workingDirPath);

                items.push(
                    ...objects.map(({ id, name, lastUpdated, lastUpdatedBy }) => ({
                        model,
                        id,
                        name,
                        lastUpdated,
                        lastUpdatedBy,
                    }))
                );
            }
        } catch (e) {
            log4js.getLogger("Metadata").debug(`Ignoring model ${model}`);
        }
    }

    return items;
};
