import { program } from "commander";
import { processMetadata } from "./api/metadata";
import { buildConfig } from "./config/builder";
import { configureLogger, getLogger } from "./config/logger";
import { updateLastUpdated } from "./io/files";
import { cloneRepo, commitMetadataChanges, commitPendingChanges, pushToOrigin } from "./io/git";

// Initialize CLI program
program.option("-c, --config <path>", "configuration file", "./config.json");
program.parse(process.argv);

// Read configuration properties and start-up logger
const config = buildConfig(program.config);
const { temporal, pushToRemote, removeTemporalFolder } = config;
configureLogger(config);

// Main script method
const start = async () => {
    // Clone repo and branch to local temporal folder
    const repo = await cloneRepo(config);

    // Fetch all metadata from models and build a list of changed items
    const metadataChanges = await processMetadata(config);
    await commitMetadataChanges(repo, metadataChanges, config);

    // Commit changes pending changes and push to remote
    updateLastUpdated(config);
    await commitPendingChanges(repo, config);
    if (pushToRemote) await pushToOrigin(repo, config);
};

start()
    .then(() => {
        getLogger("Main").debug("Execution finished");
        if (temporal) removeTemporalFolder();
    })
    .catch(e => {
        getLogger("Main").fatal(e);
        if (temporal) removeTemporalFolder();
    });
