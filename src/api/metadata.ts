import { Model, Pager } from "@eyeseetea/d2-api/2.34";
import { D2ApiDefinitionBase } from "@eyeseetea/d2-api/api/common";
import { D2ModelSchemaBase } from "@eyeseetea/d2-api/api/inference";
import _ from "lodash";
import moment from "moment";
import { getLogger } from "../config/logger";
import { writeMetadataToFile } from "../io/files";
import { Config, MetadataChange } from "../types";
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
    model: Model<D2ApiDefinitionBase, D2ModelSchemaBase>,
    query: { page?: number; pageSize?: number; lastUpdated?: string },
    config: Config,
    retry = 1
): Promise<{ objects: any[]; pager?: Pager }> => {
    const { page = 1, pageSize = 10000, lastUpdated } = query;
    const { metadataSpecialModels } = config;

    try {
        if (metadataSpecialModels?.includes(model.schema.collectionName)) await timeout(2000);

        if (model === undefined) {
            getLogger("Metadata").error(`You provided model ${model}, but it does not exist`);
            return { objects: [] };
        }

        const response = await model
            .get({
                fields,
                paging: true,
                page,
                pageSize,
                filter: lastUpdated
                    ? { lastUpdated: { gt: moment(lastUpdated).toISOString() } }
                    : undefined,
            })
            .getData();
        return response;
    } catch (e: any) {
        if (e.response?.status === 401) {
            getLogger("Metadata").error(`Invalid credentials`);
            return { objects: [] };
        } else if (e.response?.status === 404) {
            getLogger("Metadata").debug(`Ignoring model ${model}`);
            return { objects: [] };
        } else if (retry < 10) {
            const backoff = retry * 2000;
            getLogger("Metadata").error(`Failed ${model} page ${page}, retrying ${retry}/10...`);
            await timeout(backoff);
            return fetchApi(model, query, config, retry + 1);
        } else {
            return { objects: [] };
        }
    }
};

export const buildModels = ({
    api,
    metadataExcludedModels = [],
    metadataIncludedModels,
}: Config) => {
    return _.values(api.models)
        .filter(model => model.schema.metadata)
        .filter(({ schema }) => metadataIncludedModels?.includes(schema.collectionName) ?? true)
        .filter(({ schema }) => !metadataExcludedModels.includes(schema.collectionName));
};

export const processMetadata = async (config: Config) => {
    const { metadataSpecialModels, ignoreHistory, lastUpdated } = config;
    const items: MetadataChange[] = [];

    for (const model of buildModels(config)) {
        let page = 1;
        let pageCount = 1;

        while (page <= pageCount) {
            const pageMessage = pageCount > 1 ? ` (${page} of ${pageCount})` : "";
            getLogger("Metadata").debug(`Fetching model ${model.schema.collectionName}` + pageMessage);
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

            writeMetadataToFile(model.schema.collectionName, objects, config);

            if (!ignoreHistory && !metadataSpecialModels?.includes(model.schema.collectionName))
                items.push(
                    ...objects.map(({ id, name, level, lastUpdated, lastUpdatedBy }) => ({
                        model: model.schema.collectionName,
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
