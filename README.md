# Job Spy

Job Spy is a tool that tracks job postings from company job boards, detects changes, and provides a feed of job market activity.

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
