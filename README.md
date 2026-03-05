# MillionVerifier MCP

A lightweight MCP (Model Context Protocol) server that connects Claude Desktop directly to the [MillionVerifier](https://www.millionverifier.com/) real-time email verification API.

Once installed, you can ask Claude to verify emails naturally:

> "Verify these emails before I send outreach: jane@company.com, john@startup.com"

Claude will call MillionVerifier directly, consume real API credits, and return accurate results.

---

## Why an MCP instead of just giving Claude the API key?

Claude runs inside a sandboxed environment that blocks outbound HTTP requests. Even with an API key, Claude cannot call external APIs directly. An MCP server runs on your machine outside that sandbox, acts as a bridge, and makes the real network request on Claude's behalf.

---

## Prerequisites

- [Claude Desktop](https://claude.ai/download) installed
- [Node.js](https://nodejs.org/) (LTS version) installed
- A [MillionVerifier](https://app.millionverifier.com/api) account and API key

---

## Installation

**1. Clone the repo**

```bash
git clone https://github.com/YOUR_USERNAME/millionverifier-mcp.git ~/Documents/millionverifier-mcp
```

**2. Run the setup script**

```bash
bash ~/Documents/millionverifier-mcp/setup.sh
```

The script will:
- Ask for your MillionVerifier API key
- Install the Node.js dependency (`@modelcontextprotocol/sdk`)
- Automatically update your Claude Desktop config

**3. Restart Claude Desktop**

Quit Claude Desktop completely (Cmd+Q) and reopen it.

---

## Usage

Just ask Claude in plain language:

- "Verify test@example.com"
- "Check if these emails are valid before I send: jane@company.com, john@startup.com"
- "Verify all 10 emails in my outreach list"

Claude will call the `verify_emails` tool and return a result like:

```
Verified 2 email(s)
──────────────────────────────────────────────────
✅ jane@company.com
   Quality: valid | Result: ok | Free: false | Role: false

⚠️  john@startup.com
   Quality: risky | Result: catch_all | Free: false | Role: false
──────────────────────────────────────────────────
Legend: ✅ valid  ⚠️  catch-all/unknown  ❌ invalid
```

---

## Understanding results

| Quality | Meaning |
|---|---|
| `valid` | Confirmed real inbox — safe to send |
| `catch_all` | Domain accepts all emails — inbox existence unconfirmable |
| `invalid` | Address does not exist — do not send |
| `unknown` | Could not determine — treat with caution |

**Note on catch-all domains:** Many corporate email servers accept all incoming mail regardless of whether the specific inbox exists. MillionVerifier will flag these as `risky / catch_all`. This is a domain-level limitation, not a tool limitation — no email verifier can confirm individual inboxes on catch-all domains.

---

## Credits

Built by [Nicholas Yu](https://www.linkedin.com/in/nicholasyuyy/).
