/* Web-only SalahNest support form. The recipient is configured privately in Formspree. */
(() => {
  const form = document.getElementById('contactForm');
  const submit = document.getElementById('contactSubmit');
  const status = document.getElementById('contactStatus');
  if (!form || !submit || !status) return;

  const endpoint = String(window.SALAHNEST_CONTACT_ENDPOINT || '').trim();
  const endpointReady = /^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(endpoint);
  let statusKey = endpointReady ? '' : 'notReady';
  let statusKind = endpointReady ? '' : 'is-note';
  let busy = false;

  const text = (key) => {
    try { return typeof t === 'function' ? t(`contact.${key}`) : ''; }
    catch (_) { return ''; }
  };
  const setText = (id, key) => {
    const el = document.getElementById(id);
    const value = text(key);
    if (el && value) el.textContent = value;
  };
  const setStatus = (key, kind) => {
    statusKey = key;
    statusKind = kind;
    renderStatus();
  };
  const renderStatus = () => {
    status.textContent = statusKey ? text(statusKey) : '';
    status.hidden = !statusKey;
    status.className = `contact-status ${statusKind || ''}`;
    status.setAttribute('role', statusKind === 'is-error' ? 'alert' : 'status');
  };

  window.applyContactLanguage = () => {
    [
      ['contactEyebrow', 'eyebrow'], ['contactTitle', 'title'], ['contactLead', 'lead'],
      ['contactNameLabel', 'name'], ['contactEmailLabel', 'email'],
      ['contactTopicLabel', 'topic'], ['contactMessageLabel', 'message'],
      ['contactCharHint', 'charHint'], ['contactSubmitLabel', 'send'], ['contactAsideTitle', 'asideTitle'],
      ['contactAsideText', 'asideText'], ['contactAsideFoot', 'asideFoot'],
      ['contactPrivacy', 'privacy'], ['contactPrivacyLink', 'privacyLink'],
    ].forEach(([id, key]) => setText(id, key));

    const name = document.getElementById('contactName');
    const email = document.getElementById('contactEmail');
    const topic = document.getElementById('contactTopic');
    const message = document.getElementById('contactMessage');
    if (name) name.placeholder = text('namePlaceholder');
    if (email) email.placeholder = text('emailPlaceholder');
    if (topic) {
      const first = topic.options[0];
      if (first) first.textContent = text('topicChoose');
      const options = {
        help: 'topicHelp', bug: 'topicBug', feedback: 'topicFeedback', idea: 'topicIdea',
      };
      Array.from(topic.options).slice(1).forEach((option) => {
        const key = options[option.value];
        if (key) option.textContent = text(key);
      });
    }
    if (message) message.placeholder = text('messagePlaceholder');
    renderStatus();
  };

  submit.disabled = !endpointReady;
  if (endpointReady) form.action = endpoint;
  window.applyContactLanguage();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!endpointReady) {
      setStatus('notReady', 'is-note');
      return;
    }
    if (!navigator.onLine) {
      setStatus('offline', 'is-error');
      return;
    }
    if (!form.reportValidity()) return;

    busy = true;
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    setStatus('sending', 'is-note');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('submission_failed');
      form.reset();
      setStatus('success', 'is-success');
    } catch (_) {
      setStatus('failure', 'is-error');
    } finally {
      busy = false;
      submit.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
})();
