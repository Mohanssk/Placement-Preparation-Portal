#!/usr/bin/env node
// ============================================
// Admin Seeder — Promote a User to ADMIN
// ============================================
// Grants (or revokes) administrator rights on an existing account.
// Self-signup can never mint an admin, so this script is how the first
// one is created. After that, an existing admin can promote others from
// /admin/students.
//
// Usage
//   node scripts/seedAdmin.js <email>                 promote to ADMIN
//   node scripts/seedAdmin.js <email> --role STUDENT  demote back
//   node scripts/seedAdmin.js --list                  show current admins
//
// Or via npm:
//   npm run seed:admin -- you@college.edu
//
// Raw SQL equivalent, if you would rather run it in psql / the Neon console:
//   UPDATE users SET role = 'ADMIN', "updatedAt" = NOW()
//   WHERE email = 'you@college.edu';
//
// Reads DATABASE_URL from .env, same as the app.

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const VALID_ROLES = ['STUDENT', 'ALUMNI', 'ADMIN'];

// ── Console helpers ────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const log = (msg) => console.log(msg);
const ok = (msg) => console.log(`${c.green}✔${c.reset} ${msg}`);
const warn = (msg) => console.log(`${c.yellow}!${c.reset} ${msg}`);
const fail = (msg) => console.error(`${c.red}✖${c.reset} ${msg}`);

/**
 * Prints the usage block.
 */
function usage() {
  log(`
${c.bold}Admin Seeder${c.reset} — grant or revoke administrator rights

${c.bold}Usage${c.reset}
  node scripts/seedAdmin.js <email>                  Promote the account to ADMIN
  node scripts/seedAdmin.js <email> --role STUDENT    Set an explicit role
  node scripts/seedAdmin.js --list                    List all current admins
  node scripts/seedAdmin.js --help                    Show this message

${c.bold}Examples${c.reset}
  node scripts/seedAdmin.js placement.cell@college.edu
  npm run seed:admin -- placement.cell@college.edu
  node scripts/seedAdmin.js old.admin@college.edu --role STUDENT

${c.dim}Roles: ${VALID_ROLES.join(', ')}${c.reset}
`);
}

/**
 * Parses argv into { email, role, list, help }.
 *
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{email: string|null, role: string, list: boolean, help: boolean}}
 */
function parseArgs(argv) {
  const parsed = { email: null, role: 'ADMIN', list: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--list' || arg === '-l') {
      parsed.list = true;
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--role' || arg === '-r') {
      parsed.role = (argv[i + 1] || '').toUpperCase();
      i += 1;
    } else if (arg.startsWith('--role=')) {
      parsed.role = arg.split('=')[1].toUpperCase();
    } else if (!arg.startsWith('-') && !parsed.email) {
      parsed.email = arg.toLowerCase().trim();
    }
  }

  return parsed;
}

/**
 * Prints every account currently holding ADMIN.
 */
async function listAdmins() {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { name: true, email: true, createdAt: true },
  });

  if (!admins.length) {
    warn('No admin accounts exist yet. Promote one with:');
    log(`  ${c.cyan}node scripts/seedAdmin.js <email>${c.reset}`);
    return;
  }

  log(`\n${c.bold}Current administrators (${admins.length})${c.reset}`);
  admins.forEach((admin) => {
    const since = admin.createdAt.toISOString().split('T')[0];
    log(`  ${c.green}•${c.reset} ${admin.name} ${c.dim}<${admin.email}>${c.reset} ${c.dim}· member since ${since}${c.reset}`);
  });
  log('');
}

/**
 * Sets a user's role by email.
 *
 * @param {string} email
 * @param {string} role - One of VALID_ROLES
 */
async function setRole(email, role) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    fail(`No account found for ${c.bold}${email}${c.reset}`);
    log('');
    warn('Register the account through the portal first, then re-run this script.');

    // A typo in the email is the usual cause — show what is actually there.
    const sample = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { email: true, role: true },
    });

    if (sample.length) {
      log(`\n${c.dim}Most recently registered accounts:${c.reset}`);
      sample.forEach((u) => log(`  ${c.dim}- ${u.email} (${u.role})${c.reset}`));
      log('');
    }

    process.exitCode = 1;
    return;
  }

  if (user.role === role) {
    warn(`${user.name} <${user.email}> is already ${c.bold}${role}${c.reset}. Nothing to do.`);
    return;
  }

  // Refuse to remove the last admin — that would lock everyone out of /admin.
  if (user.role === 'ADMIN' && role !== 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      fail('This is the last remaining admin — demoting them would leave the portal with no administrator.');
      warn('Promote another account first, then re-run this command.');
      process.exitCode = 1;
      return;
    }
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role },
    select: { name: true, email: true, role: true },
  });

  ok(`${c.bold}${updated.name}${c.reset} <${updated.email}> is now ${c.bold}${updated.role}${c.reset} ${c.dim}(was ${user.role})${c.reset}`);

  if (updated.role === 'ADMIN') {
    log('');
    log(`  ${c.dim}Sign out and back in to refresh the session, then open${c.reset} ${c.cyan}/admin${c.reset}`);
    log('');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return;
  }

  if (args.list) {
    await listAdmins();
    return;
  }

  if (!args.email) {
    fail('An email address is required.');
    usage();
    process.exitCode = 1;
    return;
  }

  if (!VALID_ROLES.includes(args.role)) {
    fail(`Invalid role "${args.role}". Must be one of: ${VALID_ROLES.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  await setRole(args.email, args.role);
}

main()
  .catch((error) => {
    fail(error.message);
    if (error.code === 'P1001') {
      warn('Could not reach the database. Check DATABASE_URL in your .env file.');
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
