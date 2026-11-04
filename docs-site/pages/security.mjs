// v1.10.83 - "Is this open-source app safe?" (asked by users; the maintainer
// wanted it answered in the first run and in the docs). Every sentence here was
// checked against the code. When the app starts contacting a new address, or
// stops, update #what-it-connects-to: it is the list people rely on.
import { SITE } from '../site.mjs';

const ui = (s) => `<span class="ui">${s}</span>`;

export default [
{
  slug: 'security',
  title: 'Is it safe? Security and privacy',
  nav: 'Is it safe?',
  lead: 'Plain answers for anyone who has heard "open source" and wonders whether it is safe to keep their business books in it: where your data is, what the app connects to, and how to check it yourself.',
  body: `
<div class="note tip"><strong>The short answer</strong>
<p>Your invoices, clients and settings are saved as files on the host computer. On first launch you create a local administrator account; the administrator can add staff. There is no cloud signup or cloud server of ours. The app has no ads and no tracking, and it sends none of your business data to us. Every line of its code is public, so anyone can check this.</p>
<p><b>Don't take our word for it:</b> switch off your internet and use the app (it all works), or turn on <a href="#offline-mode">Offline mode</a> so it never goes online by itself. See <a href="#check-yourself">Check it yourself</a>.</p></div>

<section id="your-data-stays">
<h2>Your data stays on your computer</h2>
<ul>
  <li><strong>Saved as files on your PC.</strong> Every invoice, client, product, payment and setting is a file in the <code>_system\\data</code> folder inside the app's folder. Saved invoice PDFs go in the <b>Saved Invoices</b> folder next to it.</li>
  <li><strong>Local accounts, no cloud signup.</strong> The first administrator and optional staff accounts are stored on the host. Passwords are stored as salted hashes.</li>
  <li><strong>No cloud server.</strong> We do not run a server that holds your books. There is nothing of yours on our side to leak or to lose.</li>
  <li><strong>Google Drive only if you set it up.</strong> If you choose to connect your own Google Drive (Settings → Google Drive), copies of your invoice PDFs and backups go to <i>your</i> Drive. Nothing goes there until you do. See <a href="settings.html#google-drive">Google Drive</a>.</li>
</ul>
<p>One honest limit: the data files are not encrypted. Anyone who can sign in to your Windows or Mac account can open that folder, the same as your other documents. Protect the computer with its own password, and see <a href="#what-you-should-do">What you should do</a>.</p>
</section>

<section id="no-internet-needed">
<h2>It works without internet</h2>
<p>Everything you do day to day works offline: making and printing invoices, PDFs, payments, stock, purchases, expenses, reports, GSTR-1 and GSTR-3B files, backups, and reading a supplier's bill from a photo (OCR). The app runs on your computer and opens in your browser, but it is not a website.</p>
<p>Internet is needed only to install the app, to update it, and for the optional things listed below. When you are offline the app simply skips them; your work is not affected. Everything the app needs to run, even its font, is inside the app folder.</p>
</section>

<section id="offline-mode">
<h2>Offline mode: never go online by itself</h2>
<p>Click the Wi-Fi button at the top right of any screen and then ${ui('Turn Offline mode on')}, or tick <b>Offline mode</b> in ${ui('Settings')} → <b>Privacy &amp; internet</b>. The button turns orange, with a line through it, while it is on. From then on the app makes no internet connection by itself:</p>
<ul>
  <li>no automatic check for a new version;</li>
  <li>no automatic copy of each invoice PDF to Google Drive.</li>
</ul>
<p>Things you click still work when you click them: ${ui('Check for Updates')} and ${ui('Update')}, the ${ui('?')} help pages, ${ui('Report')}, WhatsApp and other links, and ${ui('Save to Drive')}. The setting is kept in the app's data folder, so the app's own server obeys it too. The same card lists everything that uses the internet, and when.</p>
</section>

<section id="what-it-connects-to">
<h2>Every address the app connects to</h2>
<p>This is the complete list of internet addresses. Apart from these, the app talks only to itself, or to signed-in devices on your private LAN when you explicitly enable <a href="#network">LAN access</a>.</p>
<h3>By itself, while the app is open</h3>
<div class="table-wrap"><table>
  <tr><th>Address</th><th>When</th><th>Why, and what is sent</th></tr>
  <tr><td><code>api.github.com</code>, <code>raw.githubusercontent.com</code> (GitHub)</td><td>About 5 seconds after the app opens, every 6 hours while it stays open, and when you click ${ui('Check for Updates')} in Settings</td><td>Asks GitHub which version is the newest, so the app can tell you an update is ready. Nothing about you or your business is sent.</td></tr>
</table></div>
<p><a href="#offline-mode">Offline mode</a> stops the automatic version check.</p>
<h3>Only when you do something</h3>
<div class="table-wrap"><table>
  <tr><th>Address</th><th>When</th><th>Why</th></tr>
  <tr><td><code>github.com</code> and GitHub's download servers</td><td>When you install, or click ${ui('Update')}</td><td>Downloads the app itself (the release ZIP).</td></tr>
  <tr><td><code>nodejs.org</code></td><td>During install or update, only if your computer has no recent Node.js</td><td>Downloads Node.js, the engine the app runs on, into the app's own folder. On Windows, if that fails, the installer asks before using Windows' own installer (winget).</td></tr>
  <tr><td><code>registry.npmjs.org</code></td><td>Only if the app's packages are missing or damaged and the launcher repairs them</td><td>Downloads the app's packages again. The release ZIP already contains them, so this normally never happens.</td></tr>
  <tr><td><code>accounts.google.com</code>, <code>www.googleapis.com</code> (Google)</td><td>Only after you set up Google Drive with your own Google key and sign in</td><td>Signs in to your Google account and saves invoice PDFs and backups to your Drive. The app can see only the files it put there itself. Offline mode stops the automatic copy of each PDF.</td></tr>
  <tr><td><code>dicecodes.com</code> (these help pages)</td><td>When you click a ${ui('?')} button or the User Guide</td><td>Opens this guide in your browser.</td></tr>
  <tr><td><code>github.com</code> (issues)</td><td>When you click ${ui('Report')} or Report a problem</td><td>Opens a problem form on GitHub. See <a href="#problem-reports">Problem reports</a>.</td></tr>
  <tr><td>WhatsApp, the GST portal, NSDL and other links</td><td>When you click them</td><td>Ordinary links that open in your browser, such as sharing an invoice on WhatsApp or opening the GST portal.</td></tr>
</table></div>
<p>There is nothing else: no analytics service, no advertising network, no error-tracking service, and no server of ours that receives your data.</p>
<p>For IT people: the app's Content Security Policy (in <code>src/index.html</code>) limits what the page may load or contact to the addresses above. The update check is made by the app's own server (<code>/api/check-update</code> in <code>server.js</code>); Google Drive is called from the page when you connect it.</p>
</section>

<section id="no-tracking">
<h2>No tracking, no ads, nothing sent to us</h2>
<ul>
  <li><strong>No analytics.</strong> The app does not count your clicks, screens or invoices, and does not report how you use it.</li>
  <li><strong>No ads</strong>, and no paid version that unlocks features.</li>
  <li><strong>No data sent to us.</strong> We never see your invoices, clients, amounts, GSTIN or bank details. We do not even know how many people use the app.</li>
</ul>
</section>

<section id="why-free">
<h2>Why is it free? What is the catch?</h2>
<p>There is no catch, and your data is not the product.</p>
<ul>
  <li><strong>It stays free, forever.</strong> There will be no paid version, no locked features, no ads and no tracking. And because the code is open source under the MIT licence, the app you have today can always be used, copied and kept by anyone, even if we stopped working on it. Nobody can take it away or start charging you for it.</li>
  <li><strong>It costs very little to keep going.</strong> The app runs on your computer, so there are no servers and no cloud bills for us to pay.</li>
  <li><strong>How we earn.</strong> Nexuzy Ledger is developed by Nexuzy Lab. Donations are optional and do not unlock app features. See <a href="support.html">About &amp; Support</a>.</li>
  <li><strong>Tracking you would gain us nothing.</strong> We do not sell ads or data, so there is nothing to collect. Collecting your data would also break the one promise the app is built on.</li>
  <li><strong>The code is public</strong>, so this can be checked, not just believed.</li>
</ul>
</section>

<section id="network">
<h2>LAN access is off by default</h2>
<p>The app's built-in server listens only on this computer's own internal address, <code>127.0.0.1</code>, by default. An administrator can explicitly enable <b>Settings → Users &amp; devices → Enable secure LAN access</b> for a trusted private network. That starts HTTPS listeners only on private IPv4 addresses; every device must sign in with its own account.</p>
<p>The host publishes a Nexuzy Ledger service over local-network DNS-SD/mDNS so the separate Windows, macOS, or Linux staff desktop app can find it without typing an IP address. The client opens in its own application window, not a browser. If mDNS is blocked, staff can use the host-name fallback. They sign in with the host's existing accounts; the client does not start a second business server or show first-admin setup. Install the staff app once, trust the Nexuzy Lab certificate on each device, then launch it from its desktop icon.</p>
<p>LAN HTTPS certificates are issued by a private CA named <b>Nexuzy Lab Local Network CA</b>. The connection is encrypted, but the CA is not in operating systems' public trust stores: download the CA from Settings and explicitly install it as trusted on each client device. The old CA was named “Nexuzy Ledger Local CA”; after upgrade, download and trust the new certificate again. This CA is not a code-signing certificate and cannot remove Windows' “unknown publisher” warning.</p>
<p>All devices use the host's one set of books. The host must stay on and reachable, but internet access is not required. Turn LAN access off when it is no longer needed. Do not configure router port forwarding or expose the service to the public internet.</p>
<p>The app also refuses cross-origin browser requests. A web page on another site cannot quietly read or change your books through the app in the background.</p>
</section>

<section id="host-online">
<h2>Can I put it online, on Railway, Render or a server?</h2>
<p><strong>Not yet, and please don't try.</strong> People ask whether they can host the app on a free website service (Railway, Render, a VPS, with Supabase as the database) so they can open it from anywhere. Today that is not safe, and it would not work properly:</p>
<ul>
  <li><strong>It is designed for local business use.</strong> User accounts and HTTPS LAN access protect trusted office devices, but the app is not designed to be exposed to the public internet.</li>
  <li><strong>Its normal listener is local-only</strong> (<code>127.0.0.1</code>, see <a href="#network">above</a>). LAN access is an explicit opt-in and binds only to private network addresses.</li>
  <li><strong>Supabase would not be used.</strong> The app does not use a database. It saves your books as files in its <code>data</code> folder, and on most free hosting plans those files are wiped every time the service restarts.</li>
  <li><strong>The "free" plans are not free for long.</strong> Most now give a trial credit and then charge every month, plus extra for storage that keeps your files.</li>
</ul>
<p>Hosting it publicly would place your books on someone else's server, which this app is not designed to do.</p>
<p><b>What you can do instead:</b> for office devices, use the built-in <a href="#network">trusted LAN access</a>. For public internet access, use a service designed and secured for that purpose. Keep a <a href="backup.html">backup</a> and see <a href="backup.html#move-pc">moving to a new computer</a> when changing hosts.</p>
</section>

<section id="check-yourself">
<h2>Check it yourself</h2>
<p>You don't have to trust what we write. Any of these takes a few minutes and needs no technical skill except the last two.</p>
<ol>
  <li><strong>Switch the internet off.</strong> Turn off Wi-Fi (or unplug the cable), close the app and open it again. Make an invoice, download its PDF, print it, record a payment and open Reports. Everything works. That is because nothing the app does with your books needs the internet.</li>
  <li><strong>Turn on Offline mode</strong> (above) and leave it on. The app then goes online only when you click something that needs it.</li>
  <li><strong>Watch its connections.</strong> On Windows, open <b>Resource Monitor</b> (press Windows key + R, type <code>resmon</code>, press Enter), open the <b>Network</b> tab and look at <b>node.exe</b>, the program the app runs on. Offline mode stops internet checks; if you enabled LAN access, signed-in devices still connect to the host over the private network. On a Mac, use Activity Monitor's <b>Network</b> tab. Your browser is listed separately: the app's page uses it only for the things in <a href="#what-it-connects-to">the list above</a>.</li>
  <li><strong>Block it in the firewall.</strong> In Windows Defender Firewall's <b>Advanced settings</b>, add an <b>Outbound rule</b> that blocks the app's <code>node.exe</code> (in the app folder's <code>_system\\node</code> folder, or <code>C:\\Program Files\\nodejs</code>). The app keeps working; only the update check stops. Remove the rule to update.</li>
</ol>
</section>

<section id="open-source">
<h2>What "open source" means here</h2>
<p>Open source means the full program code is public. Nexuzy Ledger's code is on <a href="${SITE.repo}">GitHub</a> under the MIT licence. Anyone (you, your IT person, a developer friend, a security researcher) can read every line and see exactly what it does. Nothing is hidden.</p>
<p>That is the opposite of a risk: a closed program asks you to trust it, while this one lets you check it. Many people look at the code, and problems they find are reported in public.</p>
<h3>How a careful user can check</h3>
<ul>
  <li><strong>Read the code.</strong> The places to look: <code>server.js</code> (the built-in server, and the only outgoing call it makes: the update check), <code>src/</code> (the screens), <code>src/index.html</code> (the list of addresses the page may contact), and <code>install.ps1</code> / <code>install.sh</code> (the install line).</li>
  <li><strong>Read the install line before running it.</strong> Open the address in the install line in your browser: it is a plain text script you can read.</li>
  <li><strong>Watch the network.</strong> Your IT person can watch the computer's connections while the app runs and compare them with the <a href="#what-it-connects-to">list above</a>.</li>
  <li><strong>Build it yourself.</strong> The release ZIP is made from this same public code with one command, <code>npm run release:zip</code>. A developer can run the app straight from the code (<code>npm install</code>, then <code>npm start</code>) instead of using our ZIP.</li>
</ul>
</section>

<section id="install-safety">
<h2>Is the install safe?</h2>
<ul>
  <li><strong>No administrator rights.</strong> The install line puts the app in your own user folder (Windows: <code>%LOCALAPPDATA%\\Programs\\Nexuzy Ledger</code>; Mac: <code>Applications</code> in your home folder). It does not change Windows system files, add a Windows service or ask for an admin password.</li>
  <li><strong>From the official place only.</strong> The install line downloads the script and the app from this project's own GitHub page, over a secure (HTTPS) connection.</li>
  <li><strong>Your data is never touched.</strong> Installing over an existing copy backs up your data to <code>Documents\\Nexuzy Ledger  Backups</code> first and replaces only the app's own files.</li>
</ul>
<h3>Why Windows or the Mac may show a warning for the ZIP</h3>
<p>The app is <b>not code-signed</b>. A signing certificate costs a few hundred dollars every year, and this app is free. So when you open the downloaded ZIP's launcher, Windows may show <b>"Windows protected your PC"</b> and a Mac may say it <b>cannot check the app</b>. That message means "this program is not signed by a paid certificate". It does not mean a virus was found. See <a href="install.html#windows-protected">"Windows protected your PC"</a>.</p>
<p>The one-line install shows no such warning because Windows and macOS put that check only on files marked as downloaded from the internet. Browsers add that mark; PowerShell and Terminal, which the install line uses, do not. It is not because the app was approved or certified by Microsoft or Apple; it was not.</p>
</section>

<section id="backups-and-lock">
<h2>Backups and the PIN lock</h2>
<ul>
  <li><strong>Daily automatic backups.</strong> Every day the app copies all your data into a dated backup and keeps the last 30 days. See <a href="backup.html#automatic-backups">Daily backups</a>.</li>
  <li><strong>A copy on another drive.</strong> Choose a second folder (another drive, a USB disk, a synced folder) and every daily backup is copied there too, so a failed hard disk does not take your books with it. See <a href="backup.html#backup-copy">Keeping a copy somewhere else</a>.</li>
  <li><strong>Before every update</strong>, the installer and the updater back up your data first.</li>
  <li><strong>PIN lock (optional).</strong> On a computer others use, turn on a 6 or 8 digit PIN in Settings → App lock. The PIN is stored only as a scrambled check value (a salted hash), never as the digits, and after five wrong tries in a row it makes you wait 30 seconds. It locks the app's screens; it does not encrypt the files. See <a href="settings.html#lock">App lock</a>.</li>
</ul>
</section>

<section id="problem-reports">
<h2>Problem reports</h2>
<p>When something goes wrong, the app notes it in the <a href="troubleshooting.html#problem-log">Problem log</a> on your computer. Nothing is sent anywhere by itself.</p>
<p>Only when <i>you</i> click ${ui('Report')} does it open a GitHub problem form in your browser, filled in with the error and your app, browser and computer type. Before that, private details are removed: GSTIN, PAN, phone numbers, email addresses, UPI IDs, IFSC codes, long numbers such as bank account numbers, and your Windows user name. You see the form before anything is posted, and it is posted only if you submit it on GitHub.</p>
</section>

<section id="updates-and-security-fixes">
<h2>Updates and security fixes</h2>
<ul>
  <li><strong>Regular updates.</strong> A new version usually comes out every Saturday, with urgent fixes sooner. The app tells you when one is ready; see <a href="update.html">Updating</a>.</li>
  <li><strong>Watched for known problems.</strong> GitHub's security alerts (Dependabot) watch the code libraries the app uses, and a known security problem in one of them is fixed in an update.</li>
  <li><strong>Only what the app needs.</strong> The download contains the built app and only the packages its server needs to run. Developer tools are left out.</li>
</ul>
</section>

<section id="what-you-should-do">
<h2>What you should do</h2>
<ul>
  <li><strong>Download only from the official places</strong>: this project's <a href="${SITE.repo}">GitHub page</a> or the install line on these pages (<code>dicecodes.com</code>). Copies on other websites, on YouTube links or forwarded on WhatsApp are not ours and may have been changed.</li>
  <li><strong>Keep Windows or macOS up to date</strong>, and keep its built-in antivirus on.</li>
  <li><strong>Put a password on your computer account</strong>, and turn on the app's PIN lock if others use the same PC.</li>
  <li><strong>Keep a backup copy on another drive</strong> or a USB disk (see <a href="backup.html#backup-copy">Keeping a copy somewhere else</a>).</li>
  <li><strong>Keep the app updated</strong>: click ${ui('Update')} when it tells you a new version is ready.</li>
</ul>
</section>

<section id="report-a-security-issue">
<h2>Found a security problem?</h2>
<p>Please report it privately, not in a public issue, so it can be fixed before anyone misuses it:</p>
<ul>
  <li><strong>GitHub private report</strong> (preferred): the <a href="${SITE.repo}/security/advisories/new">Report a vulnerability</a> button on the project's Security tab.</li>
  <li><strong>Email</strong>: <a href="mailto:info@nexuzy.in?subject=SECURITY">info@nexuzy.in</a> with <code>SECURITY</code> in the subject.</li>
</ul>
<p>Use made-up data when you describe it, never real invoices or GSTINs. The full policy is in <a href="${SITE.repo}/blob/main/SECURITY.md">SECURITY.md</a>.</p>
</section>
`,
},
];
