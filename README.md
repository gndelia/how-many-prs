# how-many-prs

https://how-many-prs.vercel.app/

Simple site to calculate how many PRs were merged in the past 30 days. You can compare against [poteto shipping 2000 prs in a month](https://x.com/poteto/status/2102050467505430555?s=20).

## Setup

Requirements: Node.js and pnpm.

1. Install the dependencies:

   ```sh
   pnpm install
   ```

2. Create a `.env.local` file with a GitHub token. The token needs only public read access.

   ```sh
   GITHUB_TOKEN=ghp_...
   ```

3. Create the local database (`local.db`):

   ```sh
   pnpm db:migrate
   ```

4. Start the dev server and open http://localhost:3000:

   ```sh
   pnpm dev
   ```

Local development does not need Turso or Upstash. The app uses `local.db` and does not apply rate limits.

## Deploy

1. Import the repo into [Vercel](https://vercel.com/new).
2. Create a [Turso](https://turso.tech) database and an [Upstash](https://upstash.com) Redis database.
3. Set these environment variables in Vercel:

   | Variable                    | Value                                  |
   | --------------------------- | -------------------------------------- |
   | `GITHUB_TOKEN`              | GitHub token                           |
   | `TURSO_DATABASE_URL`        | Turso database URL                     |
   | `TURSO_AUTH_TOKEN`          | Turso auth token                       |
   | `UPSTASH_KV_REST_API_URL`   | Upstash REST URL                       |
   | `UPSTASH_KV_REST_API_TOKEN` | Upstash REST token                     |
   | `SITE_URL` (optional)       | Public URL, if you use a custom domain |

4. Apply the migrations to the Turso database:

   ```sh
   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... pnpm db:migrate
   ```

5. Deploy.
