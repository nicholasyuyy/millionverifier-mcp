#!/usr/bin/env node
/**
 * MillionVerifier MCP Server
 * Exposes a verify_emails tool that Claude can call directly.
 * API key is passed via the MILLIONVERIFIER_API_KEY environment variable.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import https from 'https';

const API_KEY = process.env.MILLIONVERIFIER_API_KEY;

if (!API_KEY) {
  process.stderr.write('Error: MILLIONVERIFIER_API_KEY environment variable is required\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'millionverifier', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'verify_emails',
      description:
        'Verify one or more email addresses using the MillionVerifier real-time API. ' +
        'Returns the validity status and quality rating for each email. ' +
        'Use this before sending outreach to check whether emails are valid, invalid, or catch-all.',
      inputSchema: {
        type: 'object',
        properties: {
          emails: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of email addresses to verify (e.g. ["jane@example.com", "john@company.com"])'
          }
        },
        required: ['emails']
      }
    }
  ]
}));

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

function verifyEmail(email) {
  return new Promise((resolve) => {
    const url =
      `https://api.millionverifier.com/api/v3/` +
      `?api=${encodeURIComponent(API_KEY)}` +
      `&email=${encodeURIComponent(email)}` +
      `&timeout=10`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ email, ...JSON.parse(data) });
        } catch {
          resolve({ email, result: 'error', quality: 'parse_error', raw: data });
        }
      });
    }).on('error', (err) => {
      resolve({ email, result: 'error', quality: 'network_error', error: err.message });
    });
  });
}

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'verify_emails') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { emails } = request.params.arguments;

  if (!Array.isArray(emails) || emails.length === 0) {
    return { content: [{ type: 'text', text: 'No emails provided.' }] };
  }

  // Verify sequentially to respect rate limits
  const results = [];
  for (const email of emails) {
    const result = await verifyEmail(email);
    results.push(result);
  }

  // Format as a readable table
  const rows = results.map((r) => {
    let icon = '⚠️ ';
    if (r.quality === 'valid') icon = '✅';
    else if (r.quality === 'invalid' || r.result === 'error') icon = '❌';
    else if (r.quality === 'catch_all' || r.quality === 'catchall') icon = '⚠️ ';

    const quality  = r.quality  ?? 'unknown';
    const result   = r.result   ?? 'unknown';
    const free     = r.free     !== undefined ? String(r.free)  : 'n/a';
    const role     = r.role     !== undefined ? String(r.role)  : 'n/a';
    const subaddress = r.subaddress !== undefined ? String(r.subaddress) : 'n/a';

    return (
      `${icon} ${r.email}\n` +
      `   Quality: ${quality} | Result: ${result} | Free: ${free} | Role: ${role} | Subaddress: ${subaddress}`
    );
  });

  const output =
    `Verified ${results.length} email(s)\n` +
    `${'─'.repeat(50)}\n` +
    rows.join('\n\n') +
    `\n${'─'.repeat(50)}\n` +
    `Legend: ✅ valid  ⚠️  catch-all/unknown  ❌ invalid`;

  return { content: [{ type: 'text', text: output }] };
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
