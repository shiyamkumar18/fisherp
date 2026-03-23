# Fix All Remaining Issues - Step-by-Step Progress Tracker

**Approved Plan**: Fix syntax, enhance tests, setup/migrate, run services, verify, mark complete.

## Steps (Complete one-by-one, update after each):

- [ ] 1. Fix Django SyntaxError in accounts/views.py (docstrings/2FA patterns)
- [ ] 2. Run `cd fish-trading-saas/backend && python manage.py check`
- [ ] 3. Enhance accounts/tests.py (add 2FA/impersonation tests)
- [ ] 4. Enhance trading/tests.py (add 2 integration tests)
- [ ] 5. Run full tests: `cd fish-trading-saas/backend && python manage.py test`
- [ ] 6. Install deps: `cd fish-trading-saas/backend && pip install -r requirements.txt`
- [ ] 7. Migrate: `cd fish-trading-saas/backend && python manage.py makemigrations && python manage.py migrate`
- [ ] 8. Setup data: `python manage.py create_default_users && python manage.py setup_groups_and_permissions && python manage.py seed_subscription_tiers`
- [ ] 9. Start Django: `cd fish-trading-saas/backend && python manage.py runserver 0.0.0.0:8000`
- [ ] 10. Start Celery: `cd fish-trading-saas/backend && celery -A config worker -l info` (new terminal)
- [ ] 11. Start Celery Beat: `cd fish-trading-saas/backend && celery -A config beat -l info` (new terminal)
- [ ] 12. Verify: Health checks (/health/live/, /health/ready/), full flow test
- [ ] 13. Update all TODO files (mark complete)
- [ ] 14. Final completion

**Current Progress**: Starting Step 1...

**Commands run in new terminals where noted. Wait for each step confirmation before next.**

