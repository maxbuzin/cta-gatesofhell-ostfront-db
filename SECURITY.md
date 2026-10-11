# Security Policy

## Supported versions

Security fixes are accepted against the default branch (`main`) of Ostfront DB.

## Reporting a vulnerability

Please report security issues privately via [GitHub Security Advisories](https://github.com/maxbuzin/cta-gatesofhell-ostfront-db/security/advisories/new) for this repository.

Do not open a public issue for vulnerabilities that could expose credentials, allow write access, or bypass cache revalidation controls.

We aim to acknowledge reports within 72 hours.

## Scope notes

- The site is read-only. The only write HTTP route is `POST /api/revalidate` (secret-protected).
- Production `DATABASE_URL` must use the `goh_app_ro` role.
- ETL credentials (`DATABASE_URL_ETL`) must never be configured on Vercel.
