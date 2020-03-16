import log4js from "log4js";
import { Config } from "../types";

export const configureLogger = ({ loggerFileName, loggerLevel }: Config) => {
    log4js.configure({
        appenders: {
            file: {
                type: "file",
                filename: loggerFileName,
            },
            console: { type: "console" },
        },
        categories: {
            default: {
                appenders: ["console"],
                level: "info",
            },
            debug: {
                appenders: ["file"],
                level: loggerLevel,
            },
        },
    });
};

export const getLogger = (namespace?: string) => {
    const logger = log4js.getLogger(namespace);
    logger.level = "all";
    return logger;
};
