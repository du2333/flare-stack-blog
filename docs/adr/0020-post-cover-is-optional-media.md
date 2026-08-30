# Post Cover is optional Media in the Public Content Snapshot

A Post may have one Post Cover, which is a Media item, not a remote URL and not the first image in the Post body. Publishing writes that cover (or its absence) into the Public Content Snapshot; autosave does not. The site-wide Fuwari banner in Site Config stays separate. When a Published Post has a Post Cover, the public page and JSON-LD use it as the share image; otherwise there is no og:image fallback to the site banner or avatar.
