# Comment links resolve a Thread by id

A public link to a Comment is the Post page with that Comment's id in the query string. Email, webhook payloads, and admin activity use this URL. The page loads that Comment Thread by id, inserts it into the comment list if it is not already loaded, expands until the Comment is on screen, and jumps to it once layout above it has settled. Hash fragments and older highlight query parameters are not used.
