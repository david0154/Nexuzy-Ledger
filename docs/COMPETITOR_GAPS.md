# Competitor Comparison and Integration Boundaries

A dated comparison of Nexuzy Ledger with selected open-source accounting
projects and commercial Indian GST tools. This is a comparison, not a feature
roadmap; use the [README feature-status table](../README.md#feature-availability)
and [CHANGELOG.md](../CHANGELOG.md) for the current app capabilities.

> Competitor research snapshot: 2026-04-30. Pricing, features and product
> availability can change; confirm details with each vendor.

---

## Open-source GitHub competitors

| Project | Stars | Strengths over us | Weaknesses |
|---|---|---|---|
| [frappe/erpnext](https://github.com/frappe/erpnext) | ~33.3k | Full e-Invoice IRN+QR via IRP; direct GSTN portal upload; e-Way Bill API integration; GSTR-2B reconciliation; 14k+ preset HSN/SAC | Heavy Python/MariaDB stack; no offline-first PWA; complex install for a single shopkeeper |
| [akaunting/akaunting](https://github.com/akaunting/akaunting) | ~9.8k | Double-entry ledger + balance sheet + P&L; bank feed reconciliation; vendor bills; multi-user roles; app marketplace | GST features are paid add-ons, not India-first; no built-in IRN or e-Way Bill |
| [invoiceninja/invoiceninja](https://github.com/invoiceninja/invoiceninja) | ~9.7k | Stripe/PayPal/Razorpay payment links; client self-service portal; project + time-tracking; native Flutter mobile apps; PEPPOL e-invoicing | Source-available (not pure OSS); no India GST IRN; limited GSTR exports |
| [crater-invoice-inc/crater](https://github.com/crater-invoice-inc/crater) | ~8.3k | Native React Native iOS/Android apps; custom invoice fields; estimate-to-invoice conversion; per-customer default templates | No GST/HSN/SAC; no GSTR exports; no e-Way Bill — generic invoicing only |
| [InvoiceShelf/InvoiceShelf](https://github.com/InvoiceShelf/InvoiceShelf) | ~1.7k | Active Crater fork; Docker one-click; mobile companion apps; webhooks; payment gateways | Same India-GST gaps as Crater; smaller community |

## Commercial Indian GST competitors

| Tool | Pricing at research date | Selected capabilities not provided by Nexuzy Ledger |
|---|---|---|
| [TallyPrime](https://tallysolutions.com/gst/gst-invoicing-software/) | ₹22,500–₹67,500 one-time | Connected e-Invoice + IRN auto-capture; direct GSTR-1/3B GSTN upload; LAN multi-user roles |
| [Vyapar](https://vyaparapp.in/) | Free Android; ₹2,599+/yr desktop | Native Android; cheque printing; party-wise payment reminders |
| [Zoho Books India](https://www.zoho.com/in/books/pricing/) | ₹899–₹2,999/mo | GSP-licensed direct IRN generation; bank feeds; client portal; advanced workflow automation; native mobile/tablet |
| [Clear (ClearTax) GST](https://cleartax.in/gst) | Custom; ~₹3,599/yr single-CA | Direct GSTN filing; vendor compliance scoring; SAP/Oracle/Tally connectors; pre-filing validation; bulk IRN workflows |
| [Marg ERP 9+](https://margcompusoft.com/) | ₹8,100 one-time basic; ₹12,600 for GST | Pharmacy/distribution-grade inventory (batch + expiry + barcode); 1000+ pre-built reports; e-Way Bill API direct generation; loyalty/CRM |

## Indian Income Tax e-Filing format support

For end-users wanting help with personal/business tax filing, the IT
Department's portal accepts only two upload formats:

1. **JSON** (primary, since AY 2021-22) — produced by the official **Common
   Offline Utility** (Windows). Pre-filled JSON can be downloaded, edited
   offline, and re-uploaded.
2. **Excel Utility** (.xlsm with macros) — generates JSON on validation.

**There is no public REST API** for individual ITR submission. The
"upload JSON, click authenticate, done" flow can only happen through the
authenticated browser session on incometax.gov.in.

Nexuzy Ledger provides a bank-statement CSV import and an ITR-4 filing-summary
PDF to help users prepare figures. It does not produce a portal-valid ITR JSON,
authenticate with the portal or submit a return. See
[TAX_HELPER_PLAN.md](./TAX_HELPER_PLAN.md) for the current scope and limits.

**Sources:**
- [IT e-Filing Downloads & Utilities](https://www.incometax.gov.in/iec/foportal/downloads)
- [Offline Utility Manual](https://www.incometax.gov.in/iec/foportal/help/offline-utility)
- [Offline Utility FAQ](https://www.incometax.gov.in/iec/foportal/help/offline-utility-faq)

---

## What we already have that competitors charge for

For balance, here's what we already do that's gated behind paid tiers
elsewhere:

- ✅ Multi-business profile switcher (Vyapar Silver tier)
- ✅ HSN/SAC per item with auto-fill (Tally base)
- ✅ Auto CGST/SGST vs IGST split by place of supply (Tally / Zoho Premium)
- ✅ E-Way Bill JSON export (Marg Silver)
- ✅ GSTR-1 / 3B / HSN-summary CSV exports (Zoho Standard / Tally Silver)
- ✅ UPI QR on invoices (Vyapar Silver)
- ✅ Multi-currency for foreign clients (Zoho Premium)
- ✅ Per-line units with custom-unit support (Vyapar / Marg, paid)
- ✅ Round-off, Bill of Supply, Credit Note, Delivery Challan, Proforma
- ✅ Recurring invoices, expenses, purchases, receipts tracking
- ✅ Google Drive PDF backup
- ✅ Offline-first PWA (no one in this list does this — it's our differentiator)

Free, open-source, and the data lives on your machine forever. That's the
pitch.
