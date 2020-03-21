import { Pager } from "d2-api";
import _ from "lodash";
import moment from "moment";
import { getLogger } from "../config/logger";
import { writeMetadataToFile } from "../io/files";
import { Config, MetadataChange, ModelCollection, ModelName } from "../types";
import { timeout } from "../utils";

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
    model: ModelName,
    query: { page?: number; pageSize?: number; lastUpdated?: string },
    config: Config,
    retry = 1
): Promise<{ objects: any[]; pager?: Pager }> => {
    const { page = 1, pageSize = 10000, lastUpdated } = query;
    const { api, metadataSpecialModels } = config;

    try {
        if (metadataSpecialModels?.includes(model)) await timeout(2000);

        const modelCollection = api.models as ModelCollection;
        const apiModel = modelCollection[model];

        if (apiModel === undefined) {
            getLogger("Metadata").error(`You provided model ${model}, but it does not exist`);
            return { objects: [] };
        }

        const response = await apiModel
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
            return fetchApi(model, query, config, retry + 1);
        } else {
            throw new Error(`Error fetching model ${model}`);
        }
    }
};

export const buildModels = ({
    api,
    metadataExcludedModels = [],
    metadataIncludedModels,
}: Config): ModelName[] => {
    const defaultModels = _.keys(api.models) as ModelName[];
    const collection = metadataIncludedModels ?? defaultModels;
    return _.difference(collection, metadataExcludedModels);
};

export const processMetadata = async (config: Config) => {
    const { metadataSpecialModels, ignoreHistory, lastUpdated } = config;
    const items: MetadataChange[] = [];

    for (const model of buildModels(config)) {
        let page = 1;
        let pageCount = 1;

        while (page <= pageCount) {
            const pageMessage = pageCount > 1 ? ` (${page} of ${pageCount})` : "";
            getLogger("Metadata").debug(`Fetching model ${model}` + pageMessage);
            const { objects, pager = { page, pageCount } } = await fetchApi(
                model,
                {
                    page,
                    lastUpdated,
                },
                config
            );
            page = pager.page + 1;
            pageCount = pager.pageCount;

            writeMetadataToFile(model, objects, config);

            if (!ignoreHistory && !metadataSpecialModels?.includes(model))
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
