1) How to switch
→ Local Docker (dev/testing):
.env.local already exists — nothing to do. Just run npm run dev.

→ Remote cloud (production/demo):


# Temporarily rename it so Vite can't find it
mv .env.local .env.local.bak
npm run dev
# Switch back when done
mv .env.local.bak .env.local
Or set VITE_SUPABASE_URL in your shell for a one-off:


VITE_SUPABASE_URL=https://icxbgtizbdosturlxdxd.supabase.co npm run dev
For the ingest scripts (Node, not Vite), you pick manually with --env-file:


# local
node --env-file=.env.local node_modules/.bin/tsx scripts/ingest-knowledge.ts

# cloud
node --env-file=.env node_modules/.bin/tsx scripts/ingest-knowledge.ts
