import { program } from "commander";
import { buildConfig } from "./config/builder";
import { configureLogger, getLogger } from "./config/logger";
import { main } from "./tasks";

// Initialize CLI program
program.option("-c, --config <path>", "configuration file", "./config.json");
program.parse(process.argv);

// Main script method
const executor = async () => {
    // Read configuration properties and start-up logger
    const config = await buildConfig(program.opts().config);
    const { temporal, removeTemporalFolder } = config;
    configureLogger(config);

    try {
        // Execute main task
        await main(config);

        // Normal clean-up
        if (temporal) removeTemporalFolder();
        getLogger("Main").debug("Execution finished");
    } catch (e) {
        // Error clean-up
        if (temporal) removeTemporalFolder();
        getLogger("Main").fatal(e);
    }
};

executor();
