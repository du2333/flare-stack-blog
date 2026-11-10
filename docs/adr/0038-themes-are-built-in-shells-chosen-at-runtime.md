# Themes are built-in shells chosen at runtime

The public blog offers a few built-in **Themes**. The **Admin** selects one for the whole site in **Site Config**, and it takes effect on save without a rebuild. A Theme is a shell (navigation, the first screen, where sidebar cards and the footer go), a set of design-variable values, and a recipe that picks among the variants the shared content components offer. This supersedes [ADR 0012](./0012-single-public-presentation.md): the project is now deployed by several hundred forks whose owners want their own first screen, and a prototype showed that replacing only the shell already gives clearly different looks at about a quarter of the size a theme had under the Theme Contract.

A Theme never implements a page and never replaces a component. Pages, routing, data loading and the layouts of the sign-in, profile and error pages stay shared. That is the difference from the Theme Contract ([ADR 0003](./0003-theme-contract-for-public-presentation.md)), where each theme carried every page and layout and two themes meant two full sets to review. A shell places the navigation entries and sidebar cards it is given and does not list them, so a new public feature does not touch every shell.

Every Theme supports both **Colour Schemes** and honours the shared personalization fields in Site Config. The current look stays as the default Theme, so an upgrade changes nothing until the Admin picks another. Visitors cannot choose a Theme, because public pages are cached per address. There is no interface for third-party themes.

The Admin and notification emails do not follow the Theme. Design variables have a base layer that the Admin reads together with the Site Config hue; a Theme overrides them only inside its shell. This amends [ADR 0021](./0021-admin-shares-fuwari-visual-tokens.md): Admin and public pages still share one stylesheet and the same controls, but no longer the same variable values. The Admin is also where a broken Theme gets switched back, so nothing a Theme sets may reach it.

## Considered Options

- **Each Theme re-implements the content components** (post card, post page header, archive list). Rejected: it grows back into the Theme Contract.
- **Design variables only, one shared markup.** Rejected: variables cannot change structure, such as a row list instead of cards.
- **A build-time switch**, as before. Rejected: a fork owner would have to change a variable and redeploy to try a look.
- **Visitors choose the Theme.** Rejected: the same address would need one cached copy per Theme.
