import { program } from "commander";
import { D2ApiDefault, D2ModelSchemas } from "d2-api";
import fs from "fs-extra";
import _ from "lodash";
import log4js from "log4js";
import moment from "moment";
import { buildConfig } from "./utils/config";
import { createWorkingDir, getStatusFile } from "./utils/files";
import { cloneRepo, commitChanges, pushToOrigin } from "./utils/git";
import { configureLogger } from "./utils/logger";
import { processMetadata } from "./utils/metadata";

// Initialize CLI program
program.option("-c, --config <path>", "configuration file", "./config.json");
program.parse(process.argv);

// Read configuration properties
const config = buildConfig(program.config);

// Set up logger instance
const { loggerLevel, loggerFileName } = config;
configureLogger({ loggerLevel, loggerFileName });

// Set up connection with DHIS2
const { baseUrl, dhisUsername, dhisPassword } = config;
const api = new D2ApiDefault({
    baseUrl,
    auth: { username: dhisUsername, password: dhisPassword },
});

// Main script method
const start = async () => {
    // Create temporal folder to store repository
    const { name: workingDirPath, removeCallback: removeTemporalFolder } = createWorkingDir(config);

    // Clone repo and branch to local temporal folder
    const repo = await cloneRepo(workingDirPath, config);

    // Read and update lastUpdated filter (defaults to all metadata if not set)
    const statusFile = getStatusFile(workingDirPath, config);
    const { lastUpdated } = statusFile;
    fs.writeJSON(statusFile, { lastUpdated: moment().toISOString() }, { spaces: 4 });

    // For each model process all metadata
    const models = _.keys(api.models) as (keyof D2ModelSchemas)[];
    const items = await processMetadata({ api, models, lastUpdated, workingDirPath });

    // Commit changes, push to remote and delete temporal folder
    await commitChanges(repo, items, config);
    const { pushToRemote, temporal } = config;
    if (pushToRemote) await pushToOrigin(repo, config);
    if (temporal) removeTemporalFolder();
};

start()
    .then(() => log4js.getLogger("Main").debug("Execution finished"))
    .catch(e => log4js.getLogger("Main").fatal(e));
