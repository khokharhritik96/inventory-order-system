# Inventory & Order Management System

A full-stack web application for managing products, customers, orders, and inventory tracking. Built with FastAPI, React, PostgreSQL, and fully Dockerized.

## Tech Stack

- **Backend:** Python 3.11, FastAPI, SQLAlchemy 2, Pydantic v2
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router
- **Database:** PostgreSQL 16
- **Containerization:** Docker, Docker Compose
- **Web Server (production frontend):** nginx

## Features

- **Products:** create, read, update, delete; unique SKU enforcement; stock tracking
- **Customers:** create, read, update, delete; unique email enforcement
- **Orders:** create orders with multiple line items; automatic stock deduction; order status workflow (`pending → confirmed → shipped → delivered`, or `cancelled`)
- **Business rules:**
  - Unique product SKUs (database constraint + API validation)
  - Unique customer emails (database constraint + API validation)
  - Orders cannot be created if any product has insufficient stock — the API returns a clear error
  - Stock is atomically deducted when an order is placed (with row-level locking to prevent race conditions)
  - Products with existing orders cannot be deleted (referential integrity)
  - Customers with existing orders cannot be deleted
- **Dashboard:** at-a-glance counts, recent orders, low-stock alerts
- **Responsive UI:** works on mobile and desktop

## Project Structure

```
inventory-order-system/
├── backend/                FastAPI service
│   ├── app/
│   │   ├── main.py         App entrypoint
│   │   ├── config.py       Env-based settings
│   │   ├── database.py     SQLAlchemy engine + session
│   │   ├── models.py       ORM models
│   │   ├── schemas.py      Pydantic request/response schemas
│   │   └── routers/        products, customers, orders
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/               React + Vite SPA
│   ├── src/
│   │   ├── pages/          Dashboard, Products, Customers, Orders
│   │   ├── components/     Modal, EmptyState
│   │   ├── api/client.ts   Axios instance
│   │   └── types/          Shared TypeScript types
│   ├── Dockerfile          Multi-stage (Node build → nginx serve)
│   ├── nginx.conf
│   └── .env.example
├── docker-compose.yml      DB + backend + frontend orchestration
├── .env.example
└── README.md
```

## Quick Start (Docker — recommended)

**Prerequisites:** Docker Desktop (or Docker Engine + Compose v2).

```bash
# 1. Clone the repo
git clone https://github.com/khokharhritik96/inventory-order-system.git
cd inventory-order-system

# 2. Copy environment template and edit credentials
cp .env.example .env
# Edit .env and change POSTGRES_PASSWORD to a strong value

# 3. Build and start everything
docker compose up --build

# 4. Open the apps
# Frontend: http://localhost:3000
# Backend API docs (Swagger): http://localhost:8000/docs
# Backend API root: http://localhost:8000
```

Stop with `Ctrl+C`. To wipe the database, run `docker compose down -v`.

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit DATABASE_URL to point at your local Postgres
# Start a local Postgres (e.g. `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine`)
uvicorn app.main:app --reload --port 8000
```

API docs at http://localhost:8000/docs.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env  # VITE_API_URL=http://localhost:8000
npm run dev
```

Vite dev server runs on http://localhost:5173.

## API Reference

Full interactive docs at `/docs` (Swagger UI) and `/redoc`.

### Products

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/products/` | List products |
| `GET` | `/api/products/{id}` | Get product |
| `POST` | `/api/products/` | Create product (unique SKU enforced) |
| `PUT` | `/api/products/{id}` | Update product |
| `DELETE` | `/api/products/{id}` | Delete product (blocked if it has orders) |

### Customers

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/customers/` | List customers |
| `GET` | `/api/customers/{id}` | Get customer |
| `POST` | `/api/customers/` | Create customer (unique email enforced) |
| `PUT` | `/api/customers/{id}` | Update customer |
| `DELETE` | `/api/customers/{id}` | Delete customer (blocked if it has orders) |

### Orders

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/orders/` | List orders (with customer + items eager-loaded) |
| `GET` | `/api/orders/{id}` | Get order |
| `POST` | `/api/orders/` | Create order. Validates stock for every item, then atomically deducts stock |
| `PATCH` | `/api/orders/{id}/status` | Update status to one of `pending`, `confirmed`, `shipped`, `delivered`, `cancelled` |

### Example: place an order

```bash
curl -X POST http://localhost:8000/api/orders/ \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {"product_id": 1, "quantity": 2},
      {"product_id": 3, "quantity": 1}
    ]
  }'
```

If any product has insufficient stock, the API responds with `400` and a message like:

```json
{ "detail": "Insufficient stock for 'Wireless Mouse' (SKU: WM-001). Available: 1, Requested: 2" }
```

## Environment Variables

All credentials and config are environment-driven — **no hardcoded secrets**.

### Root `.env` (used by Docker Compose)

| Variable | Description | Example |
|---|---|---|
| `POSTGRES_USER` | DB user | `postgres` |
| `POSTGRES_PASSWORD` | DB password | `change-me` |
| `POSTGRES_DB` | DB name | `inventory_db` |
| `POSTGRES_PORT` | Host port for DB | `5432` |
| `BACKEND_PORT` | Host port for backend | `8000` |
| `FRONTEND_PORT` | Host port for frontend | `3000` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000` |
| `VITE_API_URL` | URL the React app calls (baked at build time) | `http://localhost:8000` |

### Backend `backend/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | Full SQLAlchemy URL |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `APP_NAME` | App display name |
| `DEBUG` | Toggle FastAPI debug |

### Frontend `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL (no trailing slash) |

## Deployment to Free Hosting

This stack is designed to deploy on free tiers. Recommended path:

### Database — Neon (free PostgreSQL)

1. Create a free Postgres project at https://neon.tech.
2. Copy the connection string (looks like `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require`).
3. Use this as `DATABASE_URL` for the backend.

Alternatives: Supabase, Railway, Render PostgreSQL, Aiven free tier.

### Backend — Render (free web service) or Railway

**Render:**

1. Push the repo to GitHub.
2. On Render, create a new **Web Service**, point at the repo, choose root `backend/`.
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add env vars: `DATABASE_URL` (Neon URL), `CORS_ORIGINS` (your frontend URL).

**Railway / Fly.io:** point at the `backend/Dockerfile`, set the same env vars.

### Frontend — Vercel or Netlify

1. New project → import the repo, root `frontend/`.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Env var: `VITE_API_URL=https://<your-backend-url>` (no trailing slash).
5. After backend is deployed, update its `CORS_ORIGINS` to include the frontend URL.

### Docker Hub

```bash
# Backend
docker build -t khokharhritik96/inventory-backend:latest ./backend
docker push khokharhritik96/inventory-backend:latest

# Frontend (bake API URL into the build)
docker build --build-arg VITE_API_URL=https://your-backend.onrender.com \
  -t khokharhritik96/inventory-frontend:latest ./frontend
docker push khokharhritik96/inventory-frontend:latest
```

## Verifying the Business Rules

Use Swagger UI at `/docs` or `curl`:

1. **Duplicate SKU rejected:** create the same SKU twice → second call returns 400.
2. **Duplicate email rejected:** create two customers with the same email → second returns 400.
3. **Insufficient stock blocked:** create a product with `stock: 1`, place an order for `quantity: 5` → 400 with a clear error.
4. **Stock auto-decrement:** create a product with `stock: 10`, place an order for 3, `GET /products/{id}` → stock is `7`.
5. **Race-free deduction:** the order route locks product rows with `SELECT ... FOR UPDATE` before validating and deducting.

## Submission Checklist

- [x] Python backend (FastAPI)
- [x] React frontend
- [x] PostgreSQL
- [x] Unique SKU + unique email
- [x] Stock validation + automatic deduction
- [x] Docker + Docker Compose
- [x] Env-based config — no hardcoded credentials
- [ ] Live frontend URL (Vercel/Netlify)
- [ ] Live backend URL (Render/Railway/Fly)
- [ ] Docker image link (Docker Hub)
- [ ] GitHub repository link

## License

MIT
