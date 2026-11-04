# Internet hosting is not supported

Do not host Nexuzy Ledger on Railway, Render, Fly.io, Vercel, a VPS, a public
IP address, or a Cloudflare Tunnel. The app stores its books as files on one
host computer and is designed for local business use, not public internet
access.

## Optional trusted local network access

For staff using more than one device in the same office, an administrator can
enable **Settings → Users & devices → Enable secure LAN access**. The app then
serves the same books over HTTPS using a local certificate. Create a separate
staff account for each person and install the certificate as trusted on every
device before signing in. The host computer must remain on and reachable; the
internet is not required.

Keep the feature off unless it is needed. If enabled, use a trusted private
Wi-Fi or wired network, allow the app through the host firewall on private
networks only, and use a DHCP reservation for a stable host address. Do not
configure router port forwarding or expose this service to the public internet.
Turn LAN access off in Settings when it is no longer needed.

See the [user guide](./USER_GUIDE.md#accounts-and-multiple-devices) for setup
and certificate-trust instructions.
