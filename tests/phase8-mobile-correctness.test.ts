import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8');

describe('Phase 8 mobile correctness', () => {
  const migration = read(
    'supabase',
    'migrations',
    '20260825160000_phase8_mobile_correctness.sql'
  );
  const portrait = read('src', 'features', 'portraits', 'api.ts');
  const settings = read('src', 'features', 'notifications', 'hooks.ts');
  const responses = read(
    'src',
    'components',
    'shared',
    'NotificationCoordinator.tsx'
  );
  const attestation = read('src', 'features', 'attestation', 'api.ts');
  const appConfig = read('app.config.ts');

  it('uses per-answer revisions and one atomic final snapshot', () => {
    expect(migration).toContain('portrait_element_revisions');
    expect(migration).toContain('serialization_failure');
    expect(migration).toContain('save_answers_and_submit_my_portrait');
    expect(portrait).toContain("rpc('save_my_portrait_answer'");
    expect(portrait).toContain("'save_answers_and_submit_my_portrait'");
  });

  it('patches notification fields and keeps failed opens retryable', () => {
    expect(settings).toContain("rpc('patch_notification_setting'");
    expect(settings).toContain('onMutate:');
    expect(responses).toContain('retryResponseOperation');
    expect(responses.indexOf('mark_invitation_opened')).toBeLessThan(
      responses.indexOf("track('notification_opened'")
    );
    expect(responses).toContain('if (await handle(response');
  });

  it('fails closed in development and requests real platform evidence', () => {
    expect(attestation).toContain('!Device.isDevice');
    expect(attestation).toContain('attestKeyAsync');
    expect(attestation).toContain('generateAssertionAsync');
    expect(attestation).toContain('requestIntegrityCheckAsync');
    expect(attestation).toContain("state: 'development'");
    expect(migration).toContain('request_attestation_review');
  });

  it('contains the Android release surface and platform links', () => {
    expect(appConfig).toContain("softwareKeyboardLayoutMode: 'resize'");
    expect(appConfig).toContain('intentFilters:');
    expect(appConfig).toContain("pathPrefix: '/human/'");
    expect(appConfig).toContain('microphonePermission: false');
    expect(read('.eas', 'workflows', 'e2e-android.yml')).toContain(
      'google_apis_playstore'
    );
  });
});
