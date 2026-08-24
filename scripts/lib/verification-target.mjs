import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

function parseCredentialFile(path) {
  if (!existsSync(path)) {
    throw new Error(`No credential file at ${path}.`);
  }
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
}

export function loadVerificationTarget() {
  if (process.argv.includes('--live')) {
    const path =
      process.env.CREDENTIALS_FILE ?? join(ROOT, 'docs', 'supa_keys.md');
    const credentials = parseCredentialFile(path);
    const target = {
      url: credentials.project_url,
      publicKey: credentials.publishable_key,
      secretKey: credentials.service_role_secret,
      label: 'live project',
    };
    if (!target.url || !target.publicKey || !target.secretKey) {
      throw new Error(
        'Credential file needs project_url, publishable_key and service_role_secret.'
      );
    }
    return target;
  }

  const envText = execFileSync('supabase', ['status', '-o', 'env'], {
    encoding: 'utf8',
  });
  const env = Object.fromEntries(
    envText
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z_]+)="?([^"\r\n]+)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]])
  );
  const target = {
    url: env.API_URL ?? env.SUPABASE_URL,
    publicKey: env.ANON_KEY ?? env.PUBLISHABLE_KEY,
    secretKey: env.SERVICE_ROLE_KEY ?? env.SECRET_KEY,
    label: 'local Supabase stack',
  };
  if (!target.url || !target.publicKey || !target.secretKey) {
    throw new Error('Local credentials are unavailable. Run `supabase start`.');
  }
  return target;
}
