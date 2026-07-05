Reservation stress test

This script simulates multiple users attempting to reserve the same card concurrently.

Run locally:

```bash
# adjust env to point to your running app and game
BASE_URL=http://localhost:3000 GAME_ID=BG-12345 USERS=100 CARD=1 node scripts/e2e/reservation-stress.js
```

Notes:
- Ensure your dev server is running and connected to the same Supabase project as the app.
- The script uses the public lobby toggle endpoint and expects the route to enforce uniqueness and return 409 on conflicts.
