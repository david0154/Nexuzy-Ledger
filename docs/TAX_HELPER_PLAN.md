# Income Tax Helper: Current Features and Limits

Nexuzy Ledger includes India-focused income-tax preparation tools. This page
documents what the current app does; it is not a filing roadmap or tax advice.

## Available in the app

Open **Income Tax** to use:

- Old- and new-regime tax comparison.
- Presumptive-tax calculations for Sections 44AD, 44ADA and 44AE.
- Advance-tax schedule and Sections 234B / 234C interest estimates.
- Bank statement CSV import, with automatic transaction categorization and
  editable categories.
- An on-screen ITR summary and an ITR-4 (Sugam) filing-summary PDF.

The bank CSV importer recognizes common statement formats from SBI, HDFC,
ICICI, Axis, Kotak, PNB and Yes Bank, with a generic column-name fallback for
other CSVs. Statements are read in the browser; the file is not uploaded to a
Nexuzy server.

## Input and output limits

- Bank statement **CSV** is supported. Bank-statement PDF, XLS and XLSX files
  are not imported; save a statement as CSV before using this feature.
- The PDF is a preparation summary. It is not an official Income Tax
  Department form and is not a portal-valid ITR JSON file.
- The app does not authenticate with the Income Tax portal, submit a return
  or file on the user's behalf.
- The app's calculations and imported transactions should be reviewed against
  source documents. Tax rules and portal schemas can change; confirm figures
  with a qualified tax professional before filing.

For general usage instructions, see the [User Guide](./USER_GUIDE.md). For
feature availability across the rest of the app, see the
[README](../README.md#feature-availability).
