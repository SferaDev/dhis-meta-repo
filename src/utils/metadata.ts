import { D2Api, D2ModelSchemas, Pager } from "d2-api";
import moment from "moment";
import { MetadataChange } from "../types";
import { writeMetadataToFile } from "./files";
import { getLogger } from "./logger";
import { timeout } from "./misc";

export const fields = {
    $owner: true,
    level: true,
    lastUpdatedBy: {
        id: true,
        name: true,
        userCredentials: { username: true },
    },
};

export const fetchApi = async (
    api: D2Api,
    model: string,
    query: { page?: number; pageSize?: number; lastUpdated?: string },
    retry = 1
): Promise<{ objects: any[]; pager?: Pager }> => {
    const { page = 1, pageSize = 10000, lastUpdated } = query;
    if (model === "organisationUnits") await timeout(2000);

    try {
        //@ts-ignore
        const response = await api.models[model]
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
        return response;
    } catch (e) {
        if (e.response?.status === 404) {
            getLogger("Metadata").debug(`Ignoring model ${model}`);
            return { objects: [] };
        } else if (retry < 10) {
            const backoff = retry * 2000;
            getLogger("Metadata").error(`Failed ${model} page ${page}, retrying in ${retry}s...`);
            await timeout(backoff);
            return fetchApi(api, model, query, retry + 1);
        } else {
            throw new Error(`Error fetching model ${model}`);
        }
    }
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
        let page = 1;
        let pageCount = 1;

        while (page <= pageCount) {
            const pageMessage = pageCount > 1 ? ` (${page} of ${pageCount})` : "";
            getLogger("Metadata").debug(`Fetching model ${model}` + pageMessage);
            const { objects, pager = { page, pageCount } } = await fetchApi(api, model, {
                page,
                lastUpdated,
            });
            page = pager.page + 1;
            pageCount = pager.pageCount;

            writeMetadataToFile(model, objects, workingDirPath);

            if (model !== "organisationUnits")
                items.push(
                    ...objects.map(({ id, name, level, lastUpdated, lastUpdatedBy }) => ({
                        model,
                        id,
                        name,
                        level,
                        lastUpdated,
                        lastUpdatedBy,
                    }))
                );
        }
    }

    return items;
};
