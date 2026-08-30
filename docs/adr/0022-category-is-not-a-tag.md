# Category is not a Tag

A **Post** may have at most one **Category**, used as a public section (Fuwari book-icon meta, sidebar list, `/posts` filter). **Tags** stay many-to-many labels. Early schema had `posts.category` as a required text column and dropped it when Tags arrived (`0001`); this restores an exclusive grouping as its own entity instead of overloading Tag or bringing back a free-text column. Uncategorized is allowed and is not a **Category**.
