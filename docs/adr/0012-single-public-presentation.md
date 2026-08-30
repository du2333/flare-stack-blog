# Ship one public presentation

The public blog is one presentation (Fuwari). There is no Theme Contract, no build-time `THEME` switch, and no second public look. Site Config still holds Fuwari personalization fields under `theme.fuwari`. This supersedes ADR 0003: a replaceable presentation seam was not worth the review cost for a personal blog that is open source as a side effect.

The sentence that Admin keeps its own stylesheet is superseded by [ADR 0021](./0021-admin-shares-fuwari-visual-tokens.md): Admin is still a workbench, but it shares Fuwari visual tokens with the public pages.
