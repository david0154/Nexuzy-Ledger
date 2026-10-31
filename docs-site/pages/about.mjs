import { SITE } from '../site.mjs';

const ui = (s) => `<span class="ui">${s}</span>`;
const DONATION_URL = 'https://razorpay.me/@nexuzylab';
const EMAIL = 'info@nexuzy.in';
const share = encodeURIComponent(`I use Nexuzy Ledger for GST invoices and business records: ${SITE.repo}`);

export default [
{
  slug: 'support',
  title: 'About & Support',
  nav: 'About & Support',
  lead: 'About Nexuzy Ledger, how to support its development, and how to contact Nexuzy Lab.',
  body: `
<section id="about">
<h2>Nexuzy Ledger by Nexuzy Lab</h2>
<p>Nexuzy Ledger is developed by Nexuzy Lab. Developers: David and Manoj Konar. It is an offline-first GST billing and business accounting app for Indian businesses. The source code is available in this <a href="${SITE.repo}">GitHub repository</a> under the MIT licence.</p>
<p>Invoices and business records are stored on your computer. Donations are entirely optional and do not unlock or change any app features.</p>
<p>For details about how the app handles data, see <a href="security.html">Security and privacy</a>.</p>
</section>

<section id="donate">
<h2>Donate to Nexuzy Lab</h2>
<p>Support ongoing development through the official <a href="${DONATION_URL}" target="_blank" rel="noopener noreferrer">Nexuzy Lab Razorpay donation page</a>. Payment is processed by Razorpay; check the recipient and amount on its payment page before confirming.</p>
<p>The app does not collect payment details. Donation is optional, and all app features remain available without donating.</p>
</section>

<section id="free-ways">
<h2>Help without donating</h2>
<p>You can help Nexuzy Ledger reach more businesses without making a payment.</p>
<ul>
  <li><strong><a href="${SITE.repo}">Star the project on GitHub</a></strong> to help other businesses find it.</li>
  <li><strong><a href="https://wa.me/?text=${share}">Share Nexuzy Ledger</a></strong> with another business.</li>
  <li><strong><a href="${SITE.repo}/issues/new/choose">Report a bug or request a feature</a></strong> in the project issue tracker.</li>
</ul>
<p>These links open their respective services in your browser.</p>
</section>

<section id="weekly">
<h2>Updates</h2>
<p>Updates and release notes are published on the project's <a href="${SITE.repo}/releases">GitHub Releases</a> page. The app can notify you when an update is available. Review the release notes before installing an update.</p>
</section>

<section id="whats-new">
<h2>What's new</h2>
<p>The <b>What's new</b> card in the app lists changes included in its bundled changelog. For the complete history, see the <a href="${SITE.repo}/blob/main/CHANGELOG.md">project changelog</a>.</p>
</section>

<section id="services">
<h2>Contact Nexuzy Lab</h2>
<p>Nexuzy Lab develops Nexuzy Ledger and software for businesses. For questions or project enquiries, email <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
</section>

<section id="in-the-app">
<h2>In the app</h2>
<p>Open ${ui('About &amp; Support')} near the bottom of the sidebar to view developer information, donation and contact links, release notes, and privacy information.</p>
</section>
`,
},
];
