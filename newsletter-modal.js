(function () {
    const DISMISS_KEY = 'checkin-newsletter-dismissed';
    const AUTO_OPEN_DELAY_MS = 1200;
    const API_BASE_URL = typeof config !== 'undefined' && config.API_BASE_URL ?
        config.API_BASE_URL :
        'https://api-3ffpwchysq-uc.a.run.app';
    const SUBSCRIBE_PATH = typeof config !== 'undefined' && config.API_ENDPOINTS ?
        config.API_ENDPOINTS.NEWSLETTER_SUBSCRIBE :
        '/api/newsletter/subscribe';
    const WELCOME_PATH = typeof config !== 'undefined' && config.API_ENDPOINTS ?
        config.API_ENDPOINTS.NEWSLETTER_WELCOME :
        '/api/newsletter/welcome-email';
    const BEEHIIV_PUBLICATION_ID = typeof config !== 'undefined' && config.BEEHIIV_PUBLICATION_ID ?
        config.BEEHIIV_PUBLICATION_ID :
        '';

    function submitToBeehiivEmbed(email, publicationId) {
        return new Promise(function (resolve, reject) {
            const frameName = 'beehiivSubscribeFrame_' + Date.now();
            const iframe = document.createElement('iframe');
            iframe.name = frameName;
            iframe.title = 'Newsletter subscribe';
            iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'https://embeds.beehiiv.com/' + encodeURIComponent(publicationId) + '/subscribe';
            form.target = frameName;
            form.style.display = 'none';

            const emailField = document.createElement('input');
            emailField.type = 'hidden';
            emailField.name = 'email';
            emailField.value = email;
            form.appendChild(emailField);

            let settled = false;

            function cleanup() {
                if (form.parentNode) form.remove();
                if (iframe.parentNode) iframe.remove();
            }

            function finish(success) {
                if (settled) return;
                settled = true;
                cleanup();
                if (success) resolve();
                else reject(new Error('Subscribe failed'));
            }

            iframe.onload = function () {
                setTimeout(function () {
                    finish(true);
                }, 600);
            };

            document.body.appendChild(iframe);
            document.body.appendChild(form);
            form.submit();

            setTimeout(function () {
                finish(true);
            }, 4000);
        });
    }

    async function subscribeViaApi(email) {
        const response = await fetch(API_BASE_URL + SUBSCRIBE_PATH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email }),
        });

        const result = await response.json().catch(function () {
            return {};
        });

        if (response.ok) {
            return result.message || "You're subscribed! Check your inbox for a welcome email from Check-In.";
        }

        throw new Error(result.message || 'Subscribe failed');
    }

    function sendWelcomeEmail(email) {
        return fetch(API_BASE_URL + WELCOME_PATH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email }),
        }).catch(function () {
            return null;
        });
    }

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

        async function subscribeWithEmail(email) {
            setStatus('', null);
            setSubmitting(true);

            try {
                let successMessage;

                try {
                    successMessage = await subscribeViaApi(email);
                } catch (apiErr) {
                    if (!BEEHIIV_PUBLICATION_ID) {
                        throw apiErr;
                    }
                    await submitToBeehiivEmbed(email, BEEHIIV_PUBLICATION_ID);
                    sendWelcomeEmail(email);
                    successMessage = "You're subscribed! Check your inbox for a welcome email from Check-In.";
                }

                setStatus(successMessage, 'success');
                sessionStorage.setItem(DISMISS_KEY, '1');
                setTimeout(function () {
                    closeModal(true);
                }, 2800);
            } catch (err) {
                setStatus(err.message || 'Could not subscribe right now. Please try again.', 'error');
            } finally {
                setSubmitting(false);
            }
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
                await subscribeWithEmail(email);
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
