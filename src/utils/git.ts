import _ from "lodash";
import log4js from "log4js";
import moment from "moment";
import { Clone, Cred, Reference, Repository, Signature } from "nodegit";
import { Config, MetadataChange } from "../types";

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

export const commitChanges = async (
    repo: Repository,
    items: MetadataChange[],
    { commiterName, commiterEmail, hideAuthor }: Config
) => {
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

export const cloneRepo = async (
    workingDirPath: string,
    { gitRepo, publicKey, privateKey, passphrase, gitBranch }: Config
) => {
    if (!gitRepo) throw new Error("You need to specify a remote git repository");

    return Clone.clone(gitRepo, workingDirPath, {
        fetchOpts: buildFetchOpts({ publicKey, privateKey, passphrase }),
        checkoutBranch: gitBranch,
    });
};

export const pushToOrigin = async (
    repo: Repository,
    { gitBranch, publicKey, privateKey, passphrase }: Config
) => {
    const remote = await repo.getRemote("origin");
    await remote.push(
        ["HEAD:refs/heads/" + gitBranch],
        buildFetchOpts({ publicKey, privateKey, passphrase })
    );
    log4js.getLogger("Git").info("[GIT] Pushed to " + gitBranch);
};
