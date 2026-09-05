# WindCall self-hosted deployment

This deployment serves WindCall from the existing VPS while leaving the
previous source tree and Docker volumes available for rollback.

- `windcall.cn`: WindCall marketing site
- `www.windcall.cn`: permanent redirect to `windcall.cn`
- `app.windcall.cn`: WindCall customer dashboard
- `admin.windcall.cn`: password-protected WindCall administrator console
- `api.windcall.cn`: collector-facing API
- `furo.art`, `www.furo.art`, and `api.furo.art`: permanent redirects to the
  corresponding WindCall addresses
- SQLite data is stored in named Docker volumes and survives container rebuilds
