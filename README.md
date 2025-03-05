# Job Spy Remix

A job tracking application that collects job postings from various company job boards.

## Features

- Track job postings from Ashby and Greenhouse job boards
- Detect new, removed, and modified job listings
- Follow companies and jobs of interest
- Filter by department and location
- User authentication and personalized feeds

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/zapfelr/job-spy-remix.git
cd job-spy-remix
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```
Then edit `.env.local` with your Supabase credentials.

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- Next.js with App Router
- TypeScript
- Tailwind CSS
- Supabase (Auth, Database)
- Cloudflare Workers (for job data collection)

## Project Structure

- `app/` - Next.js App Router pages and layouts
- `components/` - Reusable UI components
- `lib/` - Utility functions and shared code
- `public/` - Static assets
- `styles/` - Global styles

## License

This project is proprietary and confidential.

## Cloudflare Workers Setup

This project includes a Cloudflare Worker that collects job data from various company job boards. The worker is scheduled to run twice daily and can also be triggered via HTTP request.

### Configuration

1. Create a `wrangler.toml` file based on the example:
```bash
cp wrangler.example.toml wrangler.toml
```

2. Update the `wrangler.toml` file with your actual API keys and Supabase credentials.

> **IMPORTANT**: Never commit the `wrangler.toml` file to version control as it contains sensitive information. It's already added to `.gitignore`.

### Running the Worker Locally

To run the worker locally, you need to have Node.js and npm installed. Then, you can use the following command:

```bash
npx wrangler dev src/workers/job-collector.ts
```

This will start a local server that simulates the Cloudflare Workers environment. You can then trigger the worker by making a request to the local server.

### Compatibility with Cloudflare Workers

The worker is designed to be compatible with the Cloudflare Workers environment, which has some limitations compared to a regular Node.js environment:

1. **Node.js Built-in Modules**: Cloudflare Workers doesn't support Node.js built-in modules like `fs`, `path`, `os`, and `crypto` by default. To use these modules, we've added the `nodejs_compat` flag in the `wrangler.toml` file and prefixed the imports with `node:`.

2. **Database Access**: The worker uses Supabase for database access. We've created a special Supabase client for Cloudflare Workers that doesn't rely on browser-specific APIs.

3. **Environment Variables**: The worker expects the following environment variables to be set:
   - `API_SECRET`: A secret key for authenticating API requests
   - `SUPABASE_URL`: The URL of your Supabase instance
   - `SUPABASE_SERVICE_KEY`: The service key for your Supabase instance

### Deployment

To deploy the worker to Cloudflare, you can use the following command:

```bash
npx wrangler deploy src/workers/job-collector.ts
```

This will deploy the worker to your Cloudflare account. You'll need to have the Cloudflare CLI configured with your account credentials.

## Project Structure

- `src/workers/`: Contains the Cloudflare Worker code
  - `job-collector.ts`: The job collector worker
  - `types.ts`: TypeScript types for the worker
- `src/lib/`: Contains shared library code
  - `job-apis/`: Contains API integrations for different job boards
    - `ashby.ts`: Ashby API integration
    - `greenhouse.ts`: Greenhouse API integration
    - `types.ts`: Common types for job API integrations
  - `supabase-worker.ts`: Supabase client for Cloudflare Workers
  - `supabase.ts`: Supabase client for the main application
  - `supabase-script.ts`: Supabase client for scripts
  - `dotenv-worker.ts`: Simplified dotenv implementation for Cloudflare Workers
  - `error-logger.ts`: Error logging utilities
  - `job-processor.ts`: Job processing utilities

## Troubleshooting

If you encounter issues with Node.js built-in modules, make sure:

1. The `nodejs_compat` flag is set in `wrangler.toml`
2. The compatibility date is set to "2024-09-23" or later
3. Node.js built-in module imports are prefixed with `node:`

For example:
```typescript
import fs from 'node:fs';
import path from 'node:path';
```

If you're still having issues, try using the simplified worker implementation in `job-collector.ts` which avoids using problematic dependencies.
