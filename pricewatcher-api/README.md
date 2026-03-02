# PriceWatcher API

## Development

```bash
cd pricewatcher-api
npm install
npm run dev
```

## Endpoints

- GET /health
- POST /api/auth/login
- GET /api/auth/verify
- POST /api/auth/change-password

Protected (Bearer token):
- GET /api/tasks
- GET /api/tasks/:id
- POST /api/tasks
- PUT /api/tasks/:id
- DELETE /api/tasks/:id
- GET /api/prices/history/:taskId
- GET /api/stats/overview
