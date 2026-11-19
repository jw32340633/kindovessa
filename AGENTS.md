# Kindovessa — Project Instructions

## Mission and scope

Kindovessa is a production-bound, US-focused ecommerce retailer of everyday personal care, bathroom safety, mobility, daily living, home health monitoring, and comfort products. This is a client business, not a demo. Optimize for **completed, profitable orders, repeat purchasing where appropriate, customer confidence, accessibility, reliability, and fast execution**. Do not mistake visual polish or feature count for business results.

Applications:

- `frontend/`: public Next.js ecommerce storefront and customer purchase journey.
- `backend/`: authoritative APIs, commerce rules, database, payments, inventory and integrations.
- `admin/`: private operational dashboard for authorized staff.

The root file supplies shared product and engineering policy; do not duplicate it in child files. Never edit another application as a side effect of a scoped task without explicit approval. For cross-application features, identify the minimal contract changes and coordinate them intentionally.

## Audience and positioning

- **Older adults, approximately 55+**, shopping for their own needs: legibility, independence, clear product suitability, easy navigation and low-friction checkout.
- **Family members and caregivers, approximately 30–60**, purchasing for others: accurate sizing, compatibility, safety details, clear fulfillment/returns and trustworthy support.
- These are working customer segments, not stereotypes. Write respectful, practical American English. Never imply that age itself means incapacity.
- Premium but approachable; warm lifestyle presentation, not a clinical hospital catalog, generic dropshipping shop or AI-generated SaaS template.

## Catalog and merchandising

Initial categories and representative items:

1. **Personal Care & Hygiene** — protective underwear, absorbent pads, disposable briefs, bed protection and hygiene aids.
2. **Bathroom Safety & Mobility** — shower chairs, grab bars, toilet rails, walkers and rollators.
3. **Daily Living Aids** — magnifiers, reachers, easy-grip tools, jar openers and dressing aids.
4. **Health Monitoring** — blood pressure monitors, thermometers and related home-monitoring products.
5. **Comfort & Relaxation** — foot/neck massagers, heated cushions and comfort products.

Current display labels may be shorter (Personal Care, Bath & Mobility, Daily Living Aids, Health Monitors, Massagers & Comfort). Use existing approved routes/data rather than renaming categories unprompted. Do not present unapproved products as stocked.

## Commercial strategy and decision order

- Expected acquisition includes Meta advertising. **Product-specific ads should usually lead to matching product detail pages**, not the homepage carousel.
- The useful funnel is ad → accurate product page → cart → checkout → verified order. Optimize product understanding, size/variant selection, total cost clarity and checkout completion.
- Low-margin/high-volume economics are a business hypothesis, not a license to discount blindly. Consider landed cost, payment fees, ad acquisition cost, fulfillment, returns, refunds and contribution margin before recommending promotions.
- Repeat purchases and relevant complementary items matter; do not create manipulative subscriptions, forced bundles or irrelevant upsells.
- Use real analytics to decide changes: product views, add-to-cart rate, checkout completion, revenue per session, conversion, refund/return rate and contribution margin. No invented conversion lift or benchmark claims.
- Priority: **correctness and customer safety → purchasing clarity → mobile usability/accessibility → performance/reliability → brand consistency → optional polish**.

## Truthfulness, claims and trust

- Never invent product prices, inventory, reviews, sales counts, 'best seller' status, discounts, testimonials, shipping times, return policies, certifications, clinical validation, warranties or guarantees.
- 'Best Sellers' requires actual sales evidence; otherwise use 'Featured Products'. Mark fixtures as fixtures in development, not as live commercial truth.
- Product photos and AI lifestyle images must not misrepresent the actual SKU, included accessories, fit, dimensions or capabilities.
- Health-related claims require substantiation and applicable regulatory review; do not imply diagnosis, treatment or medical-device approval without evidence.
- Surface accurate sizing, weight limits, compatibility, warnings, return exclusions and delivery terms when relevant.
- Never create fake scarcity, countdowns, completed orders or purchase analytics events.

## Shared engineering operating rules

1. **Ship the smallest correct vertical slice.** No speculative features, premature microservices, generic framework-building, redundant abstractions, unnecessary dependencies or unrelated refactors.
2. Inspect existing code, dependencies, conventions, schema and documentation before changing anything. Installed framework versions and local official docs take precedence over remembered APIs. Never silently upgrade major dependencies.
3. Follow strict typing, validation at trust boundaries, explicit error handling, minimal privileges and clear ownership. Keep modules cohesive; reuse existing patterns when appropriate.
4. Do not trust browser input for pricing, stock, discounts, identity, permissions or payment state. The backend owns authoritative commerce calculations.
5. Never commit secrets, API keys, customer data, credentials, production dumps or `.env` files. Use documented environment variable names and least-privilege access.
6. Handle customer PII carefully. Avoid sensitive values in logs, error reports, analytics, URLs and test fixtures. Respect applicable US privacy, consumer-protection, accessibility and marketing requirements; flag legal decisions rather than claiming compliance.
7. Prefer established platform capabilities and managed integrations when they reduce risk and total cost. Avoid building payment, authentication or email-delivery infrastructure from scratch without a compelling requirement.
8. Design for realistic current traffic, not imaginary hyperscale. Measure bottlenecks before adding queues, caches, event buses, search clusters or distributed services.
9. Preserve working behavior and project structure. Keep changes focused, reversible and reviewable. Do not rename or move existing files solely to match an idealized architecture.
10. For new dependencies or major architecture decisions, briefly justify need, maintenance cost, security implications and simpler alternatives.

## Working with Codex

For each task: **inspect → choose minimal implementation → change → validate → report**. Ask only when a missing decision materially affects security, money, data loss or correctness; otherwise state a reasonable assumption and proceed. Do not produce long plans for small edits.

Before coding, inspect relevant files and repository status; never overwrite unrelated user changes. When touching a shared API contract, identify frontend/admin consumers and preserve compatibility or update them as explicitly scoped. Use migrations for schema changes; never edit production data as an implicit side effect.

Validation must match the change: typecheck, lint, focused tests, build, API/integration tests and manual UX checks as relevant. Report **what changed, what was actually tested, what remains incomplete, and any risks**. Never claim a test or integration passed without running it.

## Current execution policy

Prefer production-ready incremental delivery over comprehensive scaffolding. A feature is not finished if its UI merely simulates a real purchase, fulfillment, refund or payment outcome.

## UI component preference

For both frontend and admin, inspect and reuse installed shadcn components in src/components/ui/ first. Create custom components only when existing components do not suit the task.
