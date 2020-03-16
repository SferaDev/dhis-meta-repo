import { program } from "commander";
import { D2ApiDefault, D2ModelSchemas, Pager } from "d2-api";
import fs from "fs-extra";
import _ from "lodash";
import log4js from "log4js";
import moment from "moment";
import { Clone } from "nodegit";
import path from "path";
import tmp from "tmp";
import { configureLogger } from "./logger";
import { MetadataChange } from "./types";
import { writeMetadataToFile } from "./utils/files";
import { buildFetchOpts, commitChanges } from "./utils/git";
import { fetchApi } from "./utils/metadata";

program.option("-c, --config <path>", "configuration file", "./config.json");
program.parse(process.argv);

const {
    debug = true,
    dhis: {
        baseUrl = "http://play.dhis2.org/demo",
        username = "admin",
        password = "district",
    } = {},
    repo: {
        url: gitRepo = undefined,
        branch: gitBranch = "master",
        statusFileName = ".meta-repo.json",
        ssh: { publicKey = undefined, privateKey = undefined, passphrase = "" } = {},
        commiter: {
            name: commiterName = "DHIS Meta Repo",
            email: commiterEmail = "meta-repo@dhis",
        } = {},
        temporal = true,
        hideAuthor = false,
        pushToRemote = true,
    } = {},
    logger: { level: loggerLevel = "trace", fileName: loggerFileName = "debug.log" } = {},
} = fs.readJSONSync(program.config, { throws: false }) ?? {};

configureLogger({ loggerLevel, loggerFileName });
const logger = log4js.getLogger();

const api = new D2ApiDefault({
    baseUrl,
    auth: { username, password },
});

const workingDir = tmp.dirSync({ keep: debug });
logger.debug(`Working dir: ${workingDir.name}`);

const statusFile = workingDir.name + path.sep + statusFileName;

const start = async () => {
    /**
     * Limitation: Repo and branch must exist
     */
    const repo = await Clone.clone(gitRepo, workingDir.name, {
        fetchOpts: buildFetchOpts({ publicKey, privateKey, passphrase }),
        checkoutBranch: gitBranch,
    });

    fs.ensureFileSync(statusFile);
    const { lastUpdated: lastUpdatedFilter } = fs.readJSONSync(statusFile, { throws: false }) ?? {};

    const items: MetadataChange[] = [];
    const models = _.keys(api.models) as (keyof D2ModelSchemas)[];
    for (const model of models) {
        try {
            logger.debug(`Fetching model ${model}`);
            let page = 1;
            let pageCount = 1;

            while (page <= pageCount) {
                const { objects, pager } = (await fetchApi(api, model, {
                    page,
                    lastUpdatedFilter,
                })) as {
                    objects: any[];
                    pager: Pager;
                };
                page = pager.page + 1;
                pageCount = pager.pageCount;

                writeMetadataToFile(model, objects, workingDir.name);
                items.push(
                    ...objects.map(({ id, name, lastUpdated, lastUpdatedBy }) => ({
                        model,
                        id,
                        name,
                        lastUpdated,
                        lastUpdatedBy,
                    }))
                );
            }
        } catch (e) {
            logger.error(`Ignoring model ${model}`);
        }
    }

    fs.writeJSON(statusFile, { lastUpdated: moment().toISOString() }, { spaces: 4 });
    await commitChanges(repo, items, { commiterName, commiterEmail, hideAuthor });

    if (pushToRemote) {
        const remote = await repo.getRemote("origin");
        await remote.push(
            ["HEAD:refs/heads/" + gitBranch],
            buildFetchOpts({ publicKey, privateKey, passphrase })
        );
        logger.info("[GIT] Pushed to " + gitBranch);
    }

    if (temporal) {
        workingDir.removeCallback();
        logger.info("Deleted temporal dir");
    }
};

start()
    .then(() => logger.debug("Finished, see results at " + workingDir.name))
    .catch(e => logger.fatal(e));
