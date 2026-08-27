# Quarzion self-hosted deployment

This deployment serves Quarzion from the existing VPS while leaving the
previous source tree and Docker volumes available for rollback.

- `quarzion.com`: Quarzion marketing site and customer dashboard
- `www.quarzion.com`: permanent redirect to `quarzion.com`
- `admin.quarzion.com`: password-protected Quarzion administrator console
- `furo.art`, `www.furo.art`, and `api.furo.art`: permanent redirects to the
  corresponding Quarzion addresses
- SQLite data is stored in named Docker volumes and survives container rebuilds
