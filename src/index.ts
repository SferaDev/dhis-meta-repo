import { program } from "commander";
import { D2ApiDefault, D2ModelSchemas } from "d2-api";
import _ from "lodash";
import { buildConfig } from "./utils/config";
import { createWorkingDir, getStatusFile, updateLastUpdated } from "./utils/files";
import { cloneRepo, commitChanges, pushToOrigin } from "./utils/git";
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

    // Read and update lastUpdated filter (defaults to all metadata if not set)
    const statusFile = getStatusFile(workingDirPath, config);
    const { lastUpdated } = statusFile;
    updateLastUpdated(workingDirPath, config);

    // For each model process all metadata
    const models = _.keys(api.models) as (keyof D2ModelSchemas)[];
    const items = await processMetadata({ api, models, lastUpdated, workingDirPath });

    // Commit changes, push to remote and delete temporal folder
    await commitChanges(repo, items, config);
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
