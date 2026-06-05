(function () {
    const DISMISS_KEY = 'checkin-newsletter-dismissed';
    const AUTO_OPEN_DELAY_MS = 1200;
    const API_BASE_URL = typeof config !== 'undefined' && config.API_BASE_URL ?
        config.API_BASE_URL :
        'https://api-3ffpwchysq-uc.a.run.app';
    const SUBSCRIBE_PATH = typeof config !== 'undefined' && config.API_ENDPOINTS ?
        config.API_ENDPOINTS.NEWSLETTER_SUBSCRIBE :
        '/api/newsletter/subscribe';

    function init() {
        const modal = document.getElementById('newsletterModal');
        if (!modal) return;

        const overlay = modal.querySelector('.newsletter-modal-overlay');
        const closeBtn = modal.querySelector('.newsletter-modal-close');
        const dismissBtn = modal.querySelector('.newsletter-modal-dismiss');
        const form = modal.querySelector('.newsletter-modal-form');
        const emailInput = modal.querySelector('#newsletterEmail');
        const submitBtn = modal.querySelector('.newsletter-modal-submit');

        let statusEl = modal.querySelector('.newsletter-modal-status');
        if (!statusEl) {
            statusEl = document.createElement('p');
            statusEl.className = 'newsletter-modal-status';
            statusEl.setAttribute('role', 'status');
            statusEl.setAttribute('aria-live', 'polite');
            statusEl.hidden = true;
            if (form) {
                form.insertAdjacentElement('afterend', statusEl);
            } else {
                modal.querySelector('.newsletter-modal').appendChild(statusEl);
            }
        }

        function setStatus(message, type) {
            statusEl.textContent = message;
            statusEl.hidden = !message;
            statusEl.classList.remove('is-success', 'is-error');
            if (type) {
                statusEl.classList.add(type === 'success' ? 'is-success' : 'is-error');
            }
        }

        function setSubmitting(isSubmitting) {
            if (submitBtn) {
                submitBtn.disabled = isSubmitting;
                submitBtn.textContent = isSubmitting ? 'Subscribing…' : 'Subscribe';
            }
            if (emailInput) {
                emailInput.disabled = isSubmitting;
            }
        }

        function resetFormState() {
            setStatus('', null);
            setSubmitting(false);
            if (form) form.reset();
        }

        function openModal() {
            resetFormState();
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            if (emailInput) {
                setTimeout(function () {
                    emailInput.focus();
                }, 100);
            }
        }

        function closeModal(persistDismissal) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            resetFormState();
            if (persistDismissal) {
                sessionStorage.setItem(DISMISS_KEY, '1');
            }
        }

        document.querySelectorAll('.newsletter-trigger').forEach(function (trigger) {
            trigger.addEventListener('click', function (e) {
                e.preventDefault();
                openModal();
            });
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                closeModal(true);
            });
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', function () {
                closeModal(true);
            });
        }

        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeModal(true);
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) {
                closeModal(true);
            }
        });

        if (form) {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                const email = emailInput ? emailInput.value.trim() : '';
                if (!email) {
                    setStatus('Please enter your email address.', 'error');
                    return;
                }

                setStatus('', null);
                setSubmitting(true);

                try {
                    const response = await fetch(API_BASE_URL + SUBSCRIBE_PATH, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email }),
                    });

                    const result = await response.json().catch(function () {
                        return {};
                    });

                    if (response.ok) {
                        setStatus(result.message || "You're subscribed! Watch your inbox for updates.", 'success');
                        sessionStorage.setItem(DISMISS_KEY, '1');
                        setTimeout(function () {
                            closeModal(true);
                        }, 2800);
                        return;
                    }

                    setStatus(result.message || 'Something went wrong. Please try again.', 'error');
                } catch (err) {
                    setStatus('Could not connect. Check your connection and try again.', 'error');
                } finally {
                    setSubmitting(false);
                }
            });
        }

        if (!sessionStorage.getItem(DISMISS_KEY)) {
            setTimeout(openModal, AUTO_OPEN_DELAY_MS);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
