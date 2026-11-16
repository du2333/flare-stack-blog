# A Post keeps its 20 newest Post Revisions

**Post Revisions** were never removed: every publish with a change, every restore and every discard of **Unpublished Changes** left one, and each kept the **Media** it used from being deleted. A **Post** now keeps its 20 newest, whatever took them. Taking one more drops the oldest, in the same write.

- The limit is a count, fixed in code, with no exceptions. Nothing reads a particular revision: discarding **Unpublished Changes** reads the **Public Content Snapshot**, and a restored revision's content is the draft by then.
- A **Post** that already has more than 20 keeps them until it takes its next one. No migration trims.
- The count alone does not release an image: a **Post** published three times keeps all three revisions for good. So a **Media** item that only **Post Revisions** use can be deleted from the media library together with those revisions, after a confirmation that states how many revisions of how many **Posts** go with it. Deleting every unused **Media** item at once still leaves such an item alone.
- The revisions autosave took before publishing became the only way to change the public page (reason `auto`) stay readable and count toward the 20; the code that took them is gone. Deleting them is a data change that cannot be undone, which the version contract keeps for a major release, so the next major deletes them in a migration and removes the reason and its column default.

**Considered Options**

- A limit by age. It would delete history while nobody is doing anything, and a **Post** left alone for a year would lose all of it.
- A limit per reason. The list shows one timeline; separate counts make it harder to say why a revision is gone.
- A setting for the limit. Nobody has asked for a different number, and a lower one deletes history on save.
- Trimming every **Post** in a migration. An upgrade would delete history at once on every site, for a limit that only matters as a **Post** keeps changing.
- Deleting the **Media** and leaving the revisions with a missing image. Restoring a revision must never bring back an image that was deleted.
- Deleting the `auto` revisions in this release's migration. It would leave no legacy reason in the code, but it is the kind of change a site owner is promised only a major release makes.
