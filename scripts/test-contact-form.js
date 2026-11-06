'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const contactSource = read('js/contact.js');
const config = read('js/contact-config.js');
const build = read('scripts/build-web.js');
const app = read('js/app.js');
const router = read('js/extras.js');
const data = read('js/data.js');
const setup = read('docs/CONTACT-FORM-SETUP.md');
let tests = 0;
function test(name, fn) { fn(); tests++; console.log('PASS', name); }

class FakeFormData { constructor(form) { this.form = form; } }
function mount(endpoint, fetchImpl) {
  const elements = {};
  const form = {
    action: '', attributes: {}, listener: null, resetCalled: false,
    addEventListener(type, fn) { if (type === 'submit') this.listener = fn; },
    reportValidity() { return true; },
    reset() { this.resetCalled = true; },
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
  };
  const submit = { disabled: false };
  const status = {
    textContent: '', hidden: false, className: '', attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; },
  };
  const topic = { options: [
    { value: '', textContent: '' }, { value: 'help', textContent: '' },
    { value: 'bug', textContent: '' }, { value: 'feedback', textContent: '' },
    { value: 'idea', textContent: '' },
  ] };
  Object.assign(elements, {
    contactForm: form, contactSubmit: submit, contactStatus: status,
    contactTopic: topic,
    contactName: { placeholder: '' }, contactEmail: { placeholder: '' },
    contactMessage: { placeholder: '' },
  });
  const document = { getElementById(id) { return elements[id] || null; } };
  const window = { SALAHNEST_CONTACT_ENDPOINT: endpoint };
  const context = {
    window, document, navigator: { onLine: true }, FormData: FakeFormData,
    fetch: fetchImpl || (async () => ({ ok: true })),
    t(key) { return key; },
  };
  vm.runInNewContext(contactSource, context, { filename: 'contact.js' });
  return { elements, form, submit, status, topic, window };
}

(async () => {
  test('public endpoint config is a valid Formspree URL and contact copy has no recipient address', () => {
    assert.match(config, /SALAHNEST_CONTACT_ENDPOINT\s*=\s*'https:\/\/formspree\.io\/f\/[a-z0-9]+'/i);
    const publicFiles = ['js/contact.js', 'js/contact-config.js', 'styles/contact.css', 'scripts/build-web.js', 'docs/CONTACT-FORM-SETUP.md'];
    for (const file of publicFiles) assert.doesNotMatch(read(file), /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, `${file} should not include an email address`);
  });

  test('the web build injects a dedicated page, navigation, CSP access, and offline assets', () => {
    assert.match(build, /id="page-contact"/);
    assert.match(build, /data-page="contact"/);
    assert.match(build, /https:\/\/formspree\.io/);
    assert.match(build, /styles\/contact\.css/);
    assert.match(build, /js\/contact-config\.js/);
    assert.match(build, /js\/contact\.js/);
    assert.match(app, /'contact', 'settings'/);
    assert.match(router, /'downloads', 'contact', 'settings'/);
    assert.match(data, /contact: 'Help & Feedback'/);
    assert.match(data, /contact: 'مساعدة وملاحظات'/);
  });

  test('visible fields and limits are exact, with optional name and required reply email/topic/message', () => {
    assert.match(build, /name="name" type="text"[^\n]*maxlength="80"/);
    assert.match(build, /name="email" type="email"[^\n]*maxlength="254" required/);
    assert.match(build, /name="topic" required/);
    assert.match(build, /name="message" maxlength="4000" required/);
    assert.match(build, /name="_gotcha"/);
    assert.match(setup, /optional name \(up to 80 characters\)/);
    assert.match(setup, /required email address \(up to 254 characters\)/);
    assert.match(setup, /required topic/);
    assert.match(setup, /required message \(up to 4,000 characters\)/);
  });

  test('missing or non-Formspree endpoint fails closed and sends no network request', async () => {
    let calls = 0;
    const local = mount('', async () => { calls++; return { ok: true }; });
    assert.equal(local.submit.disabled, true);
    assert.match(local.status.textContent, /notReady/);
    await local.form.listener({ preventDefault() {} });
    assert.equal(calls, 0);

    const invalid = mount('https://attacker.example/f/abc123', async () => { calls++; return { ok: true }; });
    assert.equal(invalid.submit.disabled, true);
    await invalid.form.listener({ preventDefault() {} });
    assert.equal(calls, 0);
  });

  test('configured endpoint posts FormData only to Formspree and reports success without echoing content', async () => {
    const endpoint = 'https://formspree.io/f/abc123';
    let sent;
    const client = mount(endpoint, async (url, options) => {
      sent = { url, options };
      return { ok: true };
    });
    assert.equal(client.submit.disabled, false);
    assert.equal(client.form.action, endpoint);
    await client.form.listener({ preventDefault() {} });
    assert.equal(sent.url, endpoint);
    assert.equal(sent.options.method, 'POST');
    assert.equal(sent.options.headers.Accept, 'application/json');
    assert.ok(sent.options.body instanceof FakeFormData);
    assert.equal(sent.options.body.form, client.form);
    assert.equal(client.form.resetCalled, true);
    assert.equal(client.status.textContent, 'contact.success');
    assert.equal(client.submit.disabled, false);
  });

  test('failed provider responses produce a generic retry message and never log submission data', async () => {
    const client = mount('https://formspree.io/f/abc123', async () => ({ ok: false }));
    await client.form.listener({ preventDefault() {} });
    assert.equal(client.status.textContent, 'contact.failure');
    assert.match(client.status.className, /is-error/);
    assert.doesNotMatch(contactSource, /console\.(log|error)/);
  });

  console.log(`${tests} contact-form regression checks passed.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
