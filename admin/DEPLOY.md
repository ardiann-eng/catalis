# Admin Panel Deployment Guide

This guide explains how to deploy the Catalis Admin Panel to Vercel as a separate project.

> ⚠️ **PENTING: Environment Variables Wajib Diisi!**
>
> Jika Anda tidak set `REACT_APP_SUPABASE_URL` dan `REACT_APP_SUPABASE_ANON_KEY` di Vercel, admin panel akan error saat login dengan pesan:
>
> **"Failed to execute 'fetch' on 'Window': Invalid value"**
>
> Lihat **Step 2** di bawah untuk cara set environment variables yang benar.

## Prerequisites

- GitHub account with this repository pushed
- Vercel account (free tier is sufficient)
- Supabase credentials (URL and Anon Key)

## Deployment Steps

### 1. Create New Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository (catalis)
4. **IMPORTANT**: Configure the project settings:
   - **Project Name**: `catalis-admin` (or your preferred name)
   - **Root Directory**: Click **"Edit"** and select `admin`
   - **Framework Preset**: React (should auto-detect)
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `build` (auto-filled)

### 2. Configure Environment Variables ⚠️ **WAJIB!**

> **CRITICAL**: Jangan skip step ini! Tanpa environment variables, login akan error.

Before deploying, add these environment variables in Vercel:

1. In the project configuration page, scroll to **"Environment Variables"**
2. Click **"Add New"** dan isi satu per satu:

   **Variable 1:**
   - **Key**: `REACT_APP_SUPABASE_URL`
   - **Value**: `https://anzsbqqippijhemwxkqh.supabase.co`
   - **Environment**: ✓ Production ✓ Preview ✓ Development (select all)
   - Click **Save**

   **Variable 2:**
   - **Key**: `REACT_APP_SUPABASE_ANON_KEY`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuenNicXFpcHBpamhlbXd4a3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDM1MTQsImV4cCI6MjA3Njc3OTUxNH0.6l1Bt9_5_5ohFeH8IN6mP9jU0pFUToHMmV1NwQEeP-Q`
   - **Environment**: ✓ Production ✓ Preview ✓ Development (select all)
   - Click **Save**

3. **Verify**: Pastikan ada 2 variables di list dengan prefix `REACT_APP_`

> **Jika sudah deploy tapi lupa set env vars**: Lihat file `FIX-LOGIN-ERROR.md` untuk cara fix.

### 3. Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (usually 2-3 minutes)
3. Your admin panel will be available at: `https://catalis-admin.vercel.app` (or your chosen name)

## Local Development

### Setup Environment Variables

1. Copy the `.env.example` file:
   ```bash
   cd admin
   cp .env.example .env.local
   ```

2. Fill in your actual Supabase credentials in `.env.local`

3. Run the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
admin/
├── public/           # Static files
├── src/
│   ├── components/   # React components
│   ├── contexts/     # Auth context
│   ├── lib/          # Supabase client
│   ├── pages/        # Page components
│   └── App.js        # Main app component
├── vercel.json       # Vercel configuration
├── .env.example      # Environment variables template
├── .gitignore        # Git ignore rules
└── package.json      # Dependencies
```

## Automatic Deployments

After initial setup, Vercel will automatically deploy:
- **Production**: When you push to `main` branch
- **Preview**: When you create a pull request

To disable auto-deployments or configure branch settings, go to:
**Project Settings** → **Git** → **Deploy Hooks**

## Troubleshooting

### Build Fails with "Missing Environment Variables"

Make sure you've added `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` in Vercel project settings.

### 404 Error on Page Refresh

The `vercel.json` file includes SPA routing configuration. If you still get 404 errors:
1. Check that `vercel.json` exists in the `admin/` folder
2. Verify the rewrites configuration is correct
3. Redeploy the project

### Admin Panel Shows Blank Page

1. Check browser console for errors
2. Verify Supabase credentials are correct
3. Ensure Supabase RLS policies allow access for admin users

### Cannot Login to Admin Panel

1. Check that you have admin user credentials in Supabase
2. Verify Supabase URL and Key are correct
3. Check browser network tab for API errors

## URLs After Deployment

- **Main App**: https://newcatalist.vercel.app/
- **Admin Panel**: https://catalis-admin.vercel.app/ (or your chosen domain)
- **API Backend**: https://newcatalist.vercel.app/api/

Both applications share the same Supabase database.

## Production Checklist

- [ ] Environment variables configured in Vercel
- [ ] Deployment successful and app is accessible
- [ ] Admin login working
- [ ] Orders page loading correctly
- [ ] Products management functional
- [ ] Authentication redirects working
- [ ] All routes accessible (dashboard, orders, products, users)

## Support

For deployment issues, check:
- [Vercel Documentation](https://vercel.com/docs)
- [Create React App Deployment](https://create-react-app.dev/docs/deployment/)
- Project GitHub Issues
