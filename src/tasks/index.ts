import { processMetadata } from "../api/metadata";
import { updateLastUpdated } from "../io/files";
import { commitMetadataChanges, commitPendingChanges, pushToOrigin } from "../io/git";
import { Config } from "../types";

export const main = async (config: Config) => {
    const { repo, pushToRemote } = config;
    // Fetch all metadata from models and build a list of changed items
    const metadataChanges = await processMetadata(config);
    await commitMetadataChanges(repo, metadataChanges, config);

    // Commit changes pending changes and push to remote
    updateLastUpdated(config);
    await commitPendingChanges(repo, config);
    if (pushToRemote) await pushToOrigin(repo, config);
};
