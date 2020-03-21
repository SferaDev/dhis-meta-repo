import fs from "fs-extra";
import _ from "lodash";
import moment from "moment";
import { Cred, Reference, Remote, Repository, Signature } from "nodegit";
import path from "path";
import { getLogger } from "../config/logger";
import { Config, MetadataChange, UserConfig, WorkingDir } from "../types";
import { buildFileName } from "./files";

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

export const commitMetadataChanges = async (
    changes: MetadataChange[],
    { repo, commiterName, commiterEmail, hideAuthor }: Config
) => {
    const groups = _(changes)
        .sortBy(({ lastUpdated }) => {
            return moment(lastUpdated).format("YYYYMMDD");
        })
        .groupBy(({ lastUpdated, lastUpdatedBy }) => {
            const dayOfYear = moment(lastUpdated).format("YYYY-MM-DD");
            const {
                id = "unknown",
                userCredentials: { username = "unknown" } = {},
                name = "Unknown user",
            } = lastUpdatedBy ?? {};
            return [dayOfYear, id, username, name].join("_");
        })
        .value();

    for (const group in groups) {
        const [authorDate, authorId, authorUsername, authorName] = group.split("_");
        const filesToAdd = groups[group].map(({ model, ...object }) =>
            buildFileName(model, object)
        );
        const date = moment(authorDate);
        const author = Signature.create(
            authorName,
            `${authorUsername}@${authorId}`,
            date.unix(),
            date.utcOffset()
        );
        const commiter = Signature.now(commiterName, commiterEmail);
        const oid = await repo.createCommitOnHead(
            filesToAdd,
            hideAuthor ? commiter : author,
            commiter,
            `Metadata changes on ${date.utc()} by ${authorName}`
        );
        getLogger("Git").trace(`Commit ${oid} (${filesToAdd.length} files) by ${authorName}`);
    }
};

export const commitPendingChanges = async (
    { repo, commiterName, commiterEmail }: Config
) => {
    const gitIndex = await repo.refreshIndex();
    await gitIndex.addAll();
    gitIndex.write();
    const oid = await gitIndex.writeTree();
    const head = await Reference.nameToId(repo, "HEAD");
    const parent = await repo.getCommit(head);
    const commiter = Signature.now(commiterName, commiterEmail);

    await repo.createCommit("HEAD", commiter, commiter, "Update remote DHIS meta repo", oid, [
        parent,
    ]);
    getLogger("Git").trace(`Created default commit with with hash ${oid}`);
};

export const createEmptyBranch = async (
    repo: Repository,
    { workingDirPath }: WorkingDir,
    { commiterName, commiterEmail, gitBranch }: UserConfig
) => {
    fs.writeFileSync(workingDirPath + path.sep + "README.md", "## DHIS2 Metadata Repository");
    const signature = Signature.now(commiterName, commiterEmail);
    const headCommit = await repo.createCommitOnHead(
        ["README.md"],
        signature,
        signature,
        "Initial commit"
    );
    await repo.createBranch(gitBranch, headCommit, true);
};

export const cloneRepo = async (workingDir: WorkingDir, userConfig: UserConfig) => {
    const { workingDirPath } = workingDir;
    const { gitRepo, publicKey, privateKey, passphrase, gitBranch } = userConfig;
    if (!gitRepo) throw new Error("You need to specify a remote git repository");
    getLogger("Git").info(`Cloning remote repository ${gitRepo} with branch ${gitBranch}`);

    const localRepo = await Repository.init(workingDirPath, 0);
    Remote.create(localRepo, "origin", gitRepo);
    await localRepo.fetch("origin", buildFetchOpts({ publicKey, privateKey, passphrase }));

    try {
        await localRepo.getBranch(gitBranch);
    } catch (e) {
        getLogger("Git").info(`Branch ${gitBranch} did not exist on remote, creating...`);
        await createEmptyBranch(localRepo, workingDir, userConfig);
    }

    await localRepo.checkoutBranch(gitBranch);
    return localRepo;
};

export const pushToOrigin = async (
    { repo, gitBranch, publicKey, privateKey, passphrase }: Config
) => {
    getLogger("Git").info(`Pushing to remote repository ${gitBranch}`);
    const remote = await repo.getRemote("origin");
    await remote.push(
        ["HEAD:refs/heads/" + gitBranch],
        buildFetchOpts({ publicKey, privateKey, passphrase })
    );
    getLogger("Git").info(`Pushed to remote repository ${gitBranch}`);
};
