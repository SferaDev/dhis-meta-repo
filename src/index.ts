import { program } from "commander";
import { D2ApiDefault } from "d2-api";
import { buildConfig } from "./utils/config";
import { createWorkingDir, updateLastUpdated } from "./utils/files";
import { cloneRepo, commitMetadataChanges, commitPendingChanges, pushToOrigin } from "./utils/git";
import { configureLogger, getLogger } from "./utils/logger";
import { processMetadata } from "./utils/metadata";

// Initialize CLI program
program.option("-c, --config <path>", "configuration file", "./config.json");
program.parse(process.argv);

// Read configuration properties and start-up logger
const config = buildConfig(program.config);
const { baseUrl, dhisUsername, dhisPassword, temporal, pushToRemote } = config;
configureLogger(config);

// Set up connection with DHIS2
const api = new D2ApiDefault({
    baseUrl,
    auth: { username: dhisUsername, password: dhisPassword },
});

// Create temporal folder to store repository
const { name: workingDirPath, removeCallback: removeTemporalFolder } = createWorkingDir(config);

// Main script method
const start = async () => {
    // Clone repo and branch to local temporal folder
    const repo = await cloneRepo(workingDirPath, config);

    // Fetch all metadata from models and build a list of changed items
    const metadataChanges = await processMetadata(api, workingDirPath, config);
    await commitMetadataChanges(repo, metadataChanges, config);

    // Commit changes pending changes and push to remote
    updateLastUpdated(workingDirPath, config);
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
