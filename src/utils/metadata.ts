import { D2Api, Pager } from "d2-api";
import moment from "moment";

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
    { page = 1, pageSize = 10000, lastUpdatedFilter = undefined }
): Promise<{ objects: any[]; pager: Pager }> => {
    //@ts-ignore
    return api.models[model]
        .get({
            fields,
            paging: true,
            page,
            pageSize,
            filter: lastUpdatedFilter
                ? {
                      lastUpdated: {
                          gt: moment(lastUpdatedFilter).toISOString(),
                      },
                  }
                : undefined,
        })
        .getData();
};
