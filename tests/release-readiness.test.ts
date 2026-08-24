import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe('Phase 5 iOS release automation', () => {
  const workflow = read('.eas/workflows/e2e-ios.yml');
  const maestro = read('.maestro/release-smoke.yml');
  const localRunner = read('scripts/run-ios-e2e.mjs');
  const appConfig = read('app.config.ts');
  const eas = JSON.parse(read('eas.json'));
  const packageJson = JSON.parse(read('package.json'));
  const packageLock = JSON.parse(read('package-lock.json'));

  it('selects the EAS environment that contains the client configuration', () => {
    expect(eas.build.development.environment).toBe('development');
    expect(eas.build['development-simulator'].environment).toBe('development');
    expect(eas.build['e2e-test'].environment).toBe('development');
    expect(eas.build.production.environment).toBe('production');
  });

  it('records the exempt iOS encryption declaration in every build', () => {
    expect(appConfig).toContain('usesNonExemptEncryption: false');
  });

  it('targets the existing App Store Connect record for unattended submission', () => {
    expect(eas.submit.production.ios.ascAppId).toBe('6804251671');
  });

  it('pins one Expo SDK 57-compatible Worklets native graph', () => {
    expect(packageJson.dependencies).toMatchObject({
      'react-native-reanimated': '4.5.1',
      'react-native-worklets': '0.10.1',
    });

    const nativePackages = Object.entries(packageLock.packages)
      .filter(([path]) =>
        /node_modules\/(react-native-reanimated|react-native-worklets)$/.test(
          path
        )
      )
      .map(([path, value]) => [path, (value as { version?: string }).version]);

    expect(nativePackages).toEqual([
      ['node_modules/react-native-reanimated', '4.5.1'],
      ['node_modules/react-native-worklets', '0.10.1'],
    ]);
  });

  it('builds an unsigned iOS simulator artifact', () => {
    expect(eas.build['e2e-test']).toMatchObject({
      withoutCredentials: true,
      ios: { simulator: true },
    });
    expect(workflow).toContain('profile: e2e-test');
  });

  it.each(['iPhone SE (3rd generation)', 'iPhone 16', 'iPhone 16 Pro Max'])(
    'runs the same recorded smoke flow on %s',
    (device) => {
      expect(workflow).toMatch(
        new RegExp(`ios: ['"]${device.replace(/[()]/g, '\\$&')}['"]`)
      );
      expect(workflow).toContain('flow_path: .maestro/release-smoke.yml');
      expect(workflow).toContain('record_screen: true');
    }
  );

  it('has a no-subscription macOS runner for the same device matrix', () => {
    for (const device of [
      'iPhone SE (3rd generation)',
      'iPhone 16',
      'iPhone 16 Pro Max',
    ]) {
      expect(localRunner).toContain(device);
    }
    expect(localRunner).toContain('IOS_E2E_APP_PATH');
    expect(localRunner).toContain("'maestro'");
    expect(localRunner).toContain('.maestro/release-smoke.yml');
  });

  it('preserves guest access to the three core destinations', () => {
    for (const id of [
      'today-screen',
      'archive-screen',
      'settings-screen',
      'tab-today',
      'tab-archive',
      'tab-you',
    ]) {
      expect(maestro).toContain(id);
    }
  });
});

describe('Phase 5 hosted release configuration', () => {
  const verifier = read('scripts/verify-release-config.mjs');

  it('checks the hosted settings that can break authentication', () => {
    for (const invariant of [
      'https://unumae.app',
      'onehuman://',
      'external_apple_enabled',
      'mailer_templates_confirmation_content',
      'mailer_templates_magic_link_content',
      '{{ .Token }}',
      '{{ .ConfirmationURL }}',
      'smtp_host',
    ]) {
      expect(verifier).toContain(invariant);
    }
  });

  it('is read-only and never logs hosted configuration', () => {
    expect(verifier).toContain('config/auth');
    expect(verifier).not.toMatch(/method:\s*['"](?:PATCH|POST|PUT|DELETE)/);
    expect(verifier).not.toContain('JSON.stringify(config)');
  });
});

describe('Phase 5 beta assurance policy', () => {
  const migration = read(
    'supabase/migrations/20260823230000_release_assurance.sql'
  );
  const policy = read('docs/VERIFICATION_POLICY.md');
  const trust = read('website/src/content/trust.ts');

  it('removes the dormant biometric gate and RPC', () => {
    expect(migration).toContain(
      "delete from public.app_settings\nwhere key = 'require_liveness_before_publication'"
    );
    expect(migration).toContain(
      'drop function if exists public.record_liveness_check(uuid)'
    );
  });

  it('does not present liveness as a launch feature', () => {
    expect(policy).toContain('does **not** collect biometric data');
    expect(trust).not.toContain('completes liveness verification');
  });
});

describe('full-cycle release fixture', () => {
  it('explicitly opts synthetic candidates into selection', () => {
    const simulation = read('scripts/simulate-cycle.mjs');
    expect(simulation).toContain('wants_selection: true');
  });

  it('tracks the current export schema in the safety verifier', () => {
    const safety = read('scripts/verify-safety-privacy.mjs');
    expect(safety).toContain('exported.schema_version === 3');
  });

  it('verifies complete account and media deletion on live', () => {
    const deletion = read('scripts/verify-delete-account.mjs');
    expect(deletion).toContain("functions.invoke('delete-account'");
    expect(deletion).toContain('portrait photo and media storage are deleted');
    expect(deletion).toContain(
      'draw audit row remains as an anonymous tombstone'
    );
  });
});
