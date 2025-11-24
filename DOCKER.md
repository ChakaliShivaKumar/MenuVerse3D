# Docker Setup Guide

This project includes Docker Compose configuration for easy deployment and local development with PostgreSQL.

## Prerequisites

- Docker Desktop installed
- Docker Compose installed (comes with Docker Desktop)

## Quick Start

### Production Mode

1. **Set up environment variables** in `.env.local`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@postgres:5432/meniverse3d
   REPLICATE_API_TOKEN=your_replicate_token
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=meniverse3d
   PORT=3030
   ```

2. **Build and start all services**:
   ```bash
   docker-compose up -d --build
   ```

3. **Push database schema** (first time only):
   ```bash
   docker-compose exec app npm run db:push
   ```

4. **View logs**:
   ```bash
   docker-compose logs -f app
   ```

5. **Stop services**:
   ```bash
   docker-compose down
   ```

### Development Mode

For local development with hot reload, you can use Docker Compose just for PostgreSQL:

1. **Start only PostgreSQL**:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Run your app locally** (in another terminal):
   ```bash
   npm run dev
   ```

3. **Use local PostgreSQL connection**:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/meniverse3d
   ```

## Docker Commands

### Build
```bash
docker-compose build
```

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ deletes data)
```bash
docker-compose down -v
```

### View logs
```bash
docker-compose logs -f [service-name]
# Example: docker-compose logs -f app
```

### Execute commands in container
```bash
docker-compose exec app <command>
# Example: docker-compose exec app npm run db:push
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

## Services

- **app**: The main application server (Express + React)
- **postgres**: PostgreSQL database server

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database (for local PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/meniverse3d
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=meniverse3d

# Application
PORT=3030
NODE_ENV=production

# External Services
REPLICATE_API_TOKEN=your_replicate_token_here
```

**Note**: If you're using Neon or another external database, update `DATABASE_URL` accordingly and remove the `postgres` service from `docker-compose.yml`.

## Volumes

- `postgres-data`: Persistent PostgreSQL data storage
- `./uploads`: Local uploads directory mounted to container (images and 3D models)

## Network

All services are connected via the `meniverse3d-network` bridge network.

## Troubleshooting

### Port already in use
If port 3030 or 5432 is already in use:
- Change the port mapping in `docker-compose.yml`
- Or stop the conflicting service

### Database connection errors
- Ensure PostgreSQL is healthy: `docker-compose ps`
- Check logs: `docker-compose logs postgres`
- Verify `DATABASE_URL` in your environment

### Build fails
- Clear Docker cache: `docker system prune -a`
- Rebuild without cache: `docker-compose build --no-cache`


