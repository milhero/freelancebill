# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in FreelanceBill, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please use one of the following methods:

1. **GitHub Security Advisories:** [Report a vulnerability](../../security/advisories/new)
2. **Email:** Create a private advisory through GitHub (preferred)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial Assessment:** Within 1 week
- **Fix/Release:** Depends on severity, typically within 2 weeks for critical issues

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Security Best Practices for Users

- Always change the default password (`changeme123`) after first login
- Use a strong `SESSION_SECRET` (min 32 characters, use `openssl rand -hex 32`)
- Keep your instance updated to the latest version
- Use HTTPS in production (via reverse proxy)
- Restrict network access to your instance if possible
- Regularly back up your data via Settings > Backup
