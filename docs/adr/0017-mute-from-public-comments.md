# Mute from the public Comment Thread

A User who should not comment is a Muted User: they cannot create Comments until an Admin unmutes them. Muting is a site-wide User state, not a login ban, not Better Auth `banned`, and not a Friend Link restriction. The Admin applies and removes it on the public Post page; the admin muted list holds only currently Muted Users so they can be unmuted when no Comment remains visible. There is no user-management directory and no per-User Comment history, which would restore the removed Admin comments page (ADR 0010).
