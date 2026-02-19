# Fleet Interview Boilerplate

This repository contains a full-stack starter used for interview sessions.

## Stack

- `client/`: React app generated with Create React App (CRA)
- `server/`: Express API with SQLite

## Run locally

### 1) Start API

```bash
cd server
npm run start
```

Runs on `http://localhost:3001`.

### 2) Start frontend

```bash
cd client
npm run start
```

Runs on `http://localhost:3000` and proxies `/api/*` calls to the backend.
