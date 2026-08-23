import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEMPLATES_DIR = join(__dirname, '..', 'supabase', 'templates');

const templates = readdirSync(TEMPLATES_DIR)
  .filter((file) => file.endsWith('.html'))
  .map((file) => ({
    file,
    source: readFileSync(join(TEMPLATES_DIR, file), 'utf8'),
  }));

/**
 * The sign-in emails.
 *
 * These are pasted into a dashboard by hand, so nothing else in this repository
 * can stop them drifting. What follows is the closest thing to a guard: it
 * fails the build if the version we tell somebody to paste is wrong.
 */
describe('email templates', () => {
  it('there are two of them', () => {
    expect(templates.map((t) => t.file).sort()).toEqual([
      'confirmation.html',
      'magic-link.html',
    ]);
  });

  it.each(templates)('$file carries the code', ({ source }) => {
    expect(source).toContain('{{ .Token }}');
  });

  it.each(templates)('$file carries no link to follow', ({ source }) => {
    /*
     * The bug this exists for. A link cannot complete the app's code flow: it
     * hands the session to a browser, which then has to get it back to the app.
     * With the stock templates the first real sign-in landed on localhost:3000
     * with a valid session in the URL fragment and nothing listening.
     */
    expect(source).not.toContain('ConfirmationURL');
    expect(source).not.toContain('TokenHash');
  });

  it.each(templates)('$file explains nothing in a comment', ({ source }) => {
    // An HTML comment is invisible when the mail renders and entirely present
    // in its source. Anything explained inside the template travels to every
    // inbox and can be read by anyone who opens the raw message.
    expect(source).not.toContain('<!--');
  });

  it.each(templates)('$file styles inline, for mail clients', ({ source }) => {
    // Gmail strips <style> blocks; Outlook ignores most of what survives.
    expect(source).not.toContain('<style');
    expect(source).not.toContain('class=');
    expect(source).toContain('style="');
  });

  it.each(templates)('$file loads nothing from the network', ({ source }) => {
    // A remote image is blocked by default in most clients, so a template that
    // depends on one arrives broken for most people. The only link is the
    // footer, which is text.
    expect(source).not.toMatch(/<img\b/);
    expect(source).not.toContain('@import');
    expect(source).not.toMatch(/fonts\.googleapis/);
  });

  it.each(templates)('$file calls the product Unumae', ({ source }) => {
    /*
     * The old name, and only as a name.
     *
     * Case-sensitive on purpose: "One Human" and "ONE HUMAN" are the product
     * this used to be called, and a stray one here would be in the one place
     * nobody would think to look. "one human a day" is a sentence about what
     * the product does, and the footer says exactly that.
     */
    expect(source).not.toMatch(/One Human|ONE HUMAN|OneHuman/);
    expect(source).toContain('Unumae');
  });
});
