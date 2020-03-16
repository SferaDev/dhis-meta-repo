import log4js from "log4js";

export const configureLogger = ({
    loggerFileName,
    loggerLevel,
}: {
    loggerFileName: string;
    loggerLevel: string;
}) => {
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
