# Database Access Options

## Current Implementation

The project currently uses **Direct Database Connection** via:
- **Drizzle ORM** with `@neondatabase/serverless` driver
- Direct PostgreSQL connection via WebSocket
- Connection string in `DATABASE_URL` environment variable

**Advantages:**
- Type-safe queries with Drizzle ORM
- Full SQL capabilities
- Better performance (direct connection)
- No additional API layer overhead

## Neon Data API (Alternative)

Neon provides a REST API endpoint for database access:

**Endpoint:** `https://ep-hidden-bread-a41i9aap.apirest.us-east-1.aws.neon.tech/neondb/rest/v1`

### When to Use Data API

The Data API is useful for:
- **Edge Functions** - Serverless environments where direct DB connections are limited
- **Client-Side Access** - Direct database access from frontend (with proper authentication)
- **Mobile Apps** - Native apps that need database access
- **Row Level Security (RLS)** - Fine-grained access control via Postgres RLS policies

### Setup Requirements

1. **Authentication**
   - Requires API key authentication
   - Set `apikey` header or use bearer token

2. **Row Level Security**
   - Enable RLS policies in PostgreSQL
   - Currently, all tables are accessible without RLS

3. **API Key**
   - Generate API key from Neon dashboard
   - Store in environment variable: `NEON_API_KEY`

### Example Usage

```typescript
// Using Neon Data API (PostgREST)
const response = await fetch(
  'https://ep-hidden-bread-a41i9aap.apirest.us-east-1.aws.neon.tech/neondb/rest/v1/restaurants',
  {
    headers: {
      'apikey': process.env.NEON_API_KEY!,
      'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
      'Content-Type': 'application/json',
    },
  }
);
```

### Migration Considerations

To switch from Drizzle ORM to Data API:

**Pros:**
- No connection pooling needed (managed by Neon)
- Can be used from edge functions
- Built-in RLS support

**Cons:**
- Lose type safety from Drizzle ORM
- Need to rewrite all queries as REST calls
- Less SQL flexibility
- Additional network hop (slower)

### Recommendation

**Keep current Drizzle ORM setup** for:
- Better developer experience
- Type safety
- Full SQL query capabilities
- Better performance

**Consider Data API only if:**
- Deploying to edge functions (Vercel Edge, Cloudflare Workers)
- Need direct client-side database access
- Require Row Level Security policies

---

## Current Connection Details

- **Database:** Neon PostgreSQL (serverless)
- **Connection:** Direct via WebSocket
- **ORM:** Drizzle ORM
- **Schema Location:** `shared/schema.ts`
- **Migrations:** `npm run db:push` (Drizzle Kit)

## Environment Variables

```env
# Current (Direct Connection)
DATABASE_URL=postgresql://user:pass@host/dbname

# If Using Data API (Alternative)
NEON_API_KEY=your-api-key-here
NEON_DATA_API_URL=https://ep-hidden-bread-a41i9aap.apirest.us-east-1.aws.neon.tech/neondb/rest/v1
```

