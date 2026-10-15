# DNS — perchrole.com

Registrar: Namecheap (Domain Privacy on). Nameservers: Cloudflare (free plan).
All records are managed in Cloudflare. Namecheap's Advanced DNS is ignored once nameservers point to Cloudflare.

| Type  | Name | Value                                   | Proxy     | Purpose            |
|-------|------|-----------------------------------------|-----------|--------------------|
| A     | @    | value shown in Vercel (usually 76.76.21.21) | DNS only | Frontend (Vercel)  |
| CNAME | www  | value shown in Vercel (cname.vercel-dns.com) | DNS only | Frontend (Vercel)  |
| CNAME | api  | ghs.googlehosted.com                    | DNS only  | Cloud Run mapping  |
| MX    | @    | mx1.privateemail.com (priority 10)      | DNS only  | support@ mailbox   |
| MX    | @    | mx2.privateemail.com (priority 10)      | DNS only  | support@ mailbox   |
| TXT   | @    | v=spf1 include:spf.privateemail.com ~all | DNS only | SPF                |
| TXT   | default._domainkey (copy exact name from Private Email dashboard) | DKIM value from dashboard | DNS only | DKIM |
| TXT   | _dmarc | v=DMARC1; p=none; rua=mailto:support@perchrole.com | DNS only | DMARC |

Rules
- Only ONE SPF record. If a transactional sender (Resend/Brevo/SES) is added later, merge its include into the same record.
- Keep `api` DNS-only until the Cloud Run certificate is Active; test before ever proxying it.
- Vercel and mail records stay DNS-only permanently.
- Verify the MX/SPF/DKIM values against the Namecheap Private Email dashboard before saving.
- TTL: Auto, or 300s during the cutover.