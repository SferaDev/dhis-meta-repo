import { program } from "commander";
import { D2Api, D2ApiDefault, D2ModelSchemas, Pager } from "d2-api";
import fs from "fs-extra";
import _ from "lodash";
import log4js from "log4js";
import moment from "moment";
import { Clone, Cred, Reference, Repository, Signature } from "nodegit";
import path from "path";
import tmp from "tmp";

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

const logger = log4js.getLogger();
logger.level = loggerLevel;

logger.debug("config", program.config);

const api = new D2ApiDefault({
    baseUrl,
    auth: { username, password },
});

const workingDir = tmp.dirSync({ keep: debug });
logger.debug(`Working dir: ${workingDir.name}`);

const statusFile = workingDir.name + path.sep + statusFileName;

const fetchApi = async (
    api: D2Api,
    model: string,
    { page = 1, pageSize = 10000, lastUpdatedFilter = undefined }
): Promise<{ objects: any[]; pager: Pager }> => {
    //@ts-ignore
    return api.models[model]
        .get({
            fields: {
                $owner: true,
                lastUpdatedBy: {
                    id: true,
                    name: true,
                    userCredentials: { username: true },
                },
            },
            paging: true,
            page,
            pageSize,
            filter: lastUpdatedFilter
                ? {
                      lastUpdated: {
                          gt: moment(lastUpdatedFilter).toISOString(),
                      },
                  }
                : undefined,
        })
        .getData();
};

export function buildFetchOpts({ publicKey, privateKey, passphrase }: any) {
    return {
        callbacks: {
            certificateCheck: function() {
                return 0;
            },
            credentials: function(_url: string, username: string) {
                return Cred.sshKeyNew(username, publicKey, privateKey, passphrase);
            },
        },
    };
}

const buildFile = (model: string, id: string, name: string) => {
    return model + path.sep + `${id}_${name}.json`;
};

const addObjects = async (model: keyof D2ModelSchemas, objects: any[]) => {
    for (const object of objects) {
        const file = buildFile(model, object.id, object.name);
        fs.outputJSON(workingDir.name + path.sep + file, object, { spaces: 4 });
    }
};

interface MetadataChange {
    model: string;
    id: string;
    name: string;
    lastUpdated?: Date;
    lastUpdatedBy?: {
        id: string;
        name: string;
        userCredentials: { username: string };
    };
}

const commitChanges = async (repo: Repository, items: MetadataChange[]) => {
    const groups = _.groupBy(items, ({ lastUpdated, lastUpdatedBy }) => {
        const dayOfYear = moment(lastUpdated).format("YYYY-MM-DD");
        const {
            id = "deleted",
            userCredentials: { username = "unknown" } = {},
            name = "Deleted user",
        } = lastUpdatedBy ?? {};
        return [dayOfYear, id, username, name].join("_");
    });

    for (const group in groups) {
        const [authorDate, authorId, authorUsername, authorName] = group.split("_");
        const filesToAdd = groups[group].map(({ model, id, name }) => buildFile(model, id, name));
        const date = moment(authorDate);
        const author = Signature.create(
            authorName,
            `${authorUsername}@${authorId}`,
            date.unix(),
            date.utcOffset()
        );
        const commiter = Signature.now(commiterName, commiterEmail);
        await repo.createCommitOnHead(
            filesToAdd,
            hideAuthor ? commiter : author,
            commiter,
            `Metadata changes on ${date.utc()} by ${authorName}`
        );
    }

    const gitIndex = await repo.refreshIndex();
    await gitIndex.addAll();
    gitIndex.write();
    const oid = await gitIndex.writeTree();
    const head = await Reference.nameToId(repo, "HEAD");
    const parent = await repo.getCommit(head);
    const commiter = Signature.now("DHIS Meta Repo", "sferadev@gmail.com");

    await repo.createCommit("HEAD", commiter, commiter, "Update remote DHIS meta repo", oid, [
        parent,
    ]);
};

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

                addObjects(model, objects);
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
    await commitChanges(repo, items);

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
