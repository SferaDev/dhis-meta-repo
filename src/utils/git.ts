import _ from "lodash";
import moment from "moment";
import { Cred, Reference, Repository, Signature } from "nodegit";
import { MetadataChange } from "../types";

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

export const commitChanges = async (repo: Repository, items: MetadataChange[], { commiterName, commiterEmail, hideAuthor }: { commiterName: string, commiterEmail: string, hideAuthor: boolean }) => {
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
