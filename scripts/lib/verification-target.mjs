import { execFileSync } from 'node:child_process';

export function loadVerificationTarget() {
  if (process.argv.includes('--live')) {
    if (!process.env.CI || process.env.GITHUB_ACTIONS !== 'true') {
      throw new Error('Hosted verification is CI-only after Phase 10.');
    }
    const target = {
      url: process.env.SUPABASE_URL,
      publicKey: process.env.SUPABASE_ANON_KEY,
      secretKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      label: `${process.env.PROMOTION_TARGET ?? 'hosted'} project`,
    };
    if (!target.url || !target.publicKey || !target.secretKey) {
      throw new Error(
        'Hosted GitHub Environment needs URL, anon key, and service-role key.'
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
