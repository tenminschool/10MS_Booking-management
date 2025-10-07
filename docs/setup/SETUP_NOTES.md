# Setup Notes

## Docker Installation Required

Docker is not currently installed on this system. To complete the setup:

1. **Install Docker Desktop** from https://www.docker.com/products/docker-desktop/
2. **Start the database** with `docker compose up -d`
3. **Generate Supabase client** with `cd backend && npx supabase generate`
4. **Push database schema** with `cd backend && npx supabase db push`
5. **Seed the database** with `cd backend && npm run db:seed`

## Alternative Database Setup

If you prefer not to use Docker, you can:

1. Install PostgreSQL locally
2. Create a database named `speaking_test_booking`
3. Update the `DATABASE_URL` in `backend/.env` to match your local setup
4. Run the Supabase commands as above

## Current Status

✅ Project structure created
✅ Frontend React + TypeScript + Vite setup
✅ Backend Express.js + TypeScript setup  
✅ Supabase schema defined
✅ Shadcn/ui configured with 10MS branding
✅ Development scripts configured
⏳ Database setup pending (requires Docker)

## Next Steps

Once Docker is installed and the database is running:
1. Run `npm run dev` to start both frontend and backend
2. Visit http://localhost:5173 for the frontend
3. Visit http://localhost:3001/health for the backend health check