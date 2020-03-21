import { processMetadata } from "../api/metadata";
import { updateLastUpdated } from "../io/files";
import { commitMetadataChanges, commitPendingChanges, pushToOrigin } from "../io/git";
import { Config } from "../types";

export const main = async (config: Config) => {
    // Fetch all metadata from models and build a list of changed items
    const metadataChanges = await processMetadata(config);
    await commitMetadataChanges(metadataChanges, config);

    // Commit changes pending changes and push to remote
    const { pushToRemote } = config;
    updateLastUpdated(config);
    await commitPendingChanges(config);
    if (pushToRemote) await pushToOrigin(config);
};
