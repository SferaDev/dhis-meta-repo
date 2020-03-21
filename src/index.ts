import { program } from "commander";
import { processMetadata } from "./api/metadata";
import { buildConfig } from "./config/builder";
import { configureLogger, getLogger } from "./config/logger";
import { updateLastUpdated } from "./io/files";
import { commitMetadataChanges, commitPendingChanges, pushToOrigin } from "./io/git";

// Initialize CLI program
program.option("-c, --config <path>", "configuration file", "./config.json");
program.parse(process.argv);

// Main script method
const start = async () => {
    // Read configuration properties and start-up logger
    const config = await buildConfig(program.config);
    const { repo, temporal, pushToRemote, removeTemporalFolder } = config;
    configureLogger(config);

    try {
        // Fetch all metadata from models and build a list of changed items
        const metadataChanges = await processMetadata(config);
        await commitMetadataChanges(repo, metadataChanges, config);

        // Commit changes pending changes and push to remote
        updateLastUpdated(config);
        await commitPendingChanges(repo, config);
        if (pushToRemote) await pushToOrigin(repo, config);

        // Normal clean-up
        if (temporal) removeTemporalFolder();
        getLogger("Main").debug("Execution finished");
    } catch (e) {
        // Error clean-up
        if (temporal) removeTemporalFolder();
        getLogger("Main").fatal(e);
    }
};

start();
