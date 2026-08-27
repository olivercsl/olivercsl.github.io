---
title: "How to migrate DNS to Cloudflare without breaking email"
description: "A step by step Cloudflare DNS migration: what to prepare, what happens during the 24 hour window, and the five failures that break most cutovers. Includes what the free plan covers, since free means a full nameserver migration."
published: 2026-07-27
topic: "DNS"
readingMinutes: 14
author: "Oliver Zhang"
---

Migrating a domain to Cloudflare takes about ten minutes of clicking and up to 24 hours to take effect. In the gap between those two numbers sits the part that catches people out: for a period you do not control, your domain answers from two DNS providers at once. Anything missing from the new zone fails for whichever visitors reach it first, while everyone else sees a working site and reports nothing.

That asymmetry explains why DNS migrations so often appear to succeed on the day and produce strange, intermittent problems for a week afterwards. It also explains why the most common casualty is not the website but email, which fails silently.

This guide walks through the migration end to end: what to prepare, what to watch during the window, how to verify afterwards, and the specific mistakes that account for most failed cutovers. It assumes a full setup, where Cloudflare becomes the authoritative DNS provider for your domain, which is also what the free plan requires.

## What migrating actually involves

Most DNS work means editing a record. You point `www` at a new address and, if you lowered the time to live beforehand, resolvers follow within minutes.

Moving to Cloudflare on the free plan is a different operation. You are changing the **nameserver delegation** at your registrar, handing the entire zone to a new provider. Two consequences follow, and most migration surprises come from them.

**The timing is not yours to set.** Delegation is published by the registry for your top level domain, and its cache lifetime is not something your current DNS provider can shorten. Cloudflare's documentation instructs users to allow up to 24 hours for a registrar update to take effect.

**Both providers serve traffic meanwhile.** Until every resolver picks up the new delegation, some continue asking your old provider while others ask Cloudflare. Both copies of the zone must therefore return correct answers for the entire transition. A record present at the old provider but missing at Cloudflare does not fail cleanly. It fails for a shifting subset of the internet, which is why migrations appear to succeed on the day and generate strange, intermittent reports for a week.

## What the free plan covers, and why it forces a full migration

Cloudflare hosts authoritative DNS at no cost, which is why most small projects end up here. At $0 per month the plan lists DNS hosting, **unmetered** DDoS protection with no bandwidth ceiling on mitigation, a CDN, a Universal SSL certificate, a web application firewall with the free managed ruleset, and role-based account control. Pro, the next tier, is listed at $20 per month billed annually.

It is a permanent tier rather than a trial, Cloudflare publishes no DNS query cap on it, and the plan applies per domain, so several domains can each sit on the free tier. For comparison, AWS Route 53 charges $0.50 per hosted zone per month plus $0.40 per million queries, which is immaterial to a company and irritating to someone running ten side projects.

What free omits is enterprise assurance rather than capability: no uptime SLA, no PCI DSS compliance, no network prioritisation. The missing SLA is the one to weigh. The service is not less reliable on the free plan, but you have no contractual recourse if it fails, which matters more for a revenue-generating platform than a blog.

One restriction shapes this entire guide. Cloudflare's **partial setup**, sometimes called CNAME setup, lets you keep your existing DNS provider authoritative and route only selected subdomains through Cloudflare. It requires a Business or Enterprise plan. On the free plan, using Cloudflare means a full setup: the whole zone moves and your nameservers change, with the timing consequences described above.

## Before the cutover

### Export the zone, and treat the scan as incomplete

Cloudflare scans your existing DNS during onboarding and imports what it finds. Its own documentation states the scan "isn't guaranteed to find everything," and in practice it misses records that nothing on the public web references.

Export the zone file from your current provider before touching anything. That export becomes both your reconciliation checklist and your rollback reference.

Once you have it, our [DNS zone file checker](/tools/dns-zone-file-checker/) reads it in your browser and reports what a migration would break: missing SPF, DKIM or DMARC records, hostnames that must stay unproxied because mail is delivered to them, and TTLs still too long for a safe cutover. It answers a different question from a syntax validator, which tells you whether the file parses rather than whether the migration will hold.

### Account for every email record

Email is the most frequent casualty of a DNS migration and the least visible. A broken website generates complaints within minutes. Broken mail generates silence, followed some days later by a colleague asking why a customer never replied.

Four record types matter:

- **MX**, with priorities intact
- **SPF**, a TXT record declaring who may send as your domain
- **DKIM**, a TXT record at a selector subdomain such as `selector1._domainkey`
- **DMARC**, a TXT record at `_dmarc`

DKIM records are lost most often, because they sit at an unusual subdomain that nothing links to. The failure mode is quiet: mail still delivers, but unsigned, and deliverability degrades until messages begin landing in spam. By the time anyone notices, the migration is weeks in the past and rarely suspected.

### Collect the verification records

Ownership proofs for Google Workspace, Microsoft 365, AWS, payment processors and SaaS platforms are typically TXT or CNAME records that nothing else references. Losing one can un-verify a service days later when a scheduled recheck fails. Your zone export captures these. The scan may not.

### Lower record TTLs a day ahead

You cannot shorten the delegation cache, but you can shorten the TTLs on individual records. Set them to 300 seconds at your current provider at least one full old-TTL before the migration.

This does not accelerate the nameserver change. It means that if a record needs correcting mid-migration, the fix propagates in minutes rather than hours, which is the difference between a brief incident and a long one.

### Disable DNSSEC before you touch the nameservers

If DNSSEC is enabled, disable it at the registrar and wait for that change to take effect before switching nameservers. Cloudflare warns that changing nameservers with DNSSEC active "can make domains unreachable."

This failure is total rather than partial. Validating resolvers refuse to answer at all, because the signatures no longer match the delegation. Of every step in this process, it is the one most capable of taking a working domain completely offline, and it is entirely avoidable.

### Decide proxy status per record in advance

Cloudflare can proxy A, AAAA and CNAME records. A proxied record returns Cloudflare's anycast addresses instead of yours, which is what provides caching, the firewall and origin protection. All other record types, including MX and TXT, are served as ordinary DNS.

Determine the intended state for each record before activating rather than during:

- **Proxy** hostnames serving HTTP traffic to browsers.
- **Do not proxy** the hostname your MX records point at. Mail does not traverse an HTTP proxy, and proxying that host stops inbound delivery.
- **Do not proxy** domain verification records, or hostnames used by non-HTTP services such as SSH, VPN endpoints or databases.

## During the cutover

### Reconcile against the export

Compare Cloudflare's imported records line by line with the zone you exported: type, name, value, MX priority, TTL. This is the step that prevents the fortnight of intermittent breakage, and the step most often skipped because the scanned list looks plausible at a glance.

### Set the SSL mode before traffic arrives

Configure the encryption mode before the nameservers change, because it takes effect the instant traffic begins flowing through the proxy.

**Full (strict)** is the appropriate default. Cloudflare connects to the origin over HTTPS and validates the certificate, which must come from a public certificate authority or Cloudflare's Origin CA.

**Full** also connects over HTTPS but does not validate the certificate, which suits origins using self signed certificates.

**Flexible** should be avoided. Visitors reach Cloudflare over HTTPS, but Cloudflare reaches the origin over unencrypted HTTP. Cloudflare's documentation describes this as creating a false sense of security: the padlock tells visitors they are protected while the connection behind Cloudflare is not.

Flexible mode also produces the classic redirect loop. Where an origin redirects HTTP to HTTPS, and Cloudflare arrives over HTTP, the origin redirects, Cloudflare requests again over HTTP, and the browser eventually abandons the request. The site appears entirely broken within minutes of activation, and the error gives no hint of the cause.

### Change the nameservers

Remove the existing nameservers at your registrar and add the pair Cloudflare assigned to your zone, exactly as issued. They are specific to your account.

### Wait, and leave the old zone running

Allow up to 24 hours for activation. Throughout that window, do not delete the zone at your previous provider and do not close the account. Resolvers that have not yet picked up the new delegation are still querying the old nameservers, and removing that zone cuts those visitors off immediately.

The impulse to tidy up arrives the moment Cloudflare marks the domain Active. Resist it for at least a week.

## After the cutover

### Verify from outside your own network

Your machine may hold cached answers, and your resolver may be ahead of or behind others.

```
dig NS example.com +short
dig A www.example.com +short
dig MX example.com +short
```

A public checker such as whatsmydns.net queries resolvers worldwide, exposing partial propagation that a single lookup conceals.

### Test mail in both directions

Send to an external address, and have someone send in. Then confirm the authentication records resolve:

```
dig TXT example.com +short                        # SPF
dig TXT _dmarc.example.com +short                 # DMARC
dig TXT selector1._domainkey.example.com +short   # DKIM
```

Inspecting the headers of a received message confirms whether SPF, DKIM and DMARC actually passed, rather than merely that records exist.

### Confirm HTTPS behaviour

Load the site over both HTTP and HTTPS. HTTP should redirect once to HTTPS rather than looping. A loop at this point almost always indicates Flexible mode against an origin that requires HTTPS.

### Re-enable DNSSEC

Enable DNSSEC in Cloudflare, then publish the resulting DS record at your registrar. Do this once activation is confirmed, not during the transition.

### Restore ordinary TTLs

The 300 second TTLs used for the migration cost additional queries and amplify the user-visible impact of any future DNS outage. Once the migration has settled, return them to something conventional such as one hour.

### Lock down the origin

Proxying conceals your origin address from casual observation. It does not prevent anyone who already knows the address from connecting directly, and old addresses persist in DNS history services indefinitely. A single record left unproxied can expose the same server.

Where origin protection is part of the reason for moving, restrict the origin firewall to accept HTTP traffic only from Cloudflare's published address ranges. Without that, the proxy is a suggestion rather than a control.

## The five failures behind most broken migrations

Ordered by frequency rather than severity.

1. **A DKIM or verification TXT record never made the move.** Nothing breaks visibly. Deliverability degrades, or a service un-verifies days later.
2. **SSL mode left on Flexible.** An immediate redirect loop, or a site that appears encrypted while the origin connection is not.
3. **The mail hostname was proxied.** Inbound mail stops, while the MX record itself looks correct in the dashboard.
4. **The old zone was deleted too early.** Intermittent failures for whichever portion of the internet still holds the old delegation.
5. **DNSSEC left enabled through the nameserver change.** The domain becomes unreachable for validating resolvers. The most severe outcome here, and the easiest to prevent.

## Rolling back

Rollback means repointing the nameservers to your previous provider at the registrar, which is precisely why the old zone must remain intact and accurate. It is not instant, and it is bounded by the same delegation cache that made the original change slow.

That asymmetry is the case for front-loading the preparation. The migration is quick to begin and slow to reverse, so the work belongs before the switch rather than after it.

## Planning the timing

To lay this sequence against real dates, our [DNS TTL and cutover planner](/tools/dns-ttl-planner/) converts a cutover time and your current TTLs into a timeline: when to lower the TTL, when the change is effectively propagated, and when it is safe to restore normal values.
