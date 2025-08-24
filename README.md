# FlipCheck API

A lightweight API service for FlipCheck's eBay integration, designed to work with Figma-hosted frontends.

## Features

- **eBay Search API**: Real-time product search with fallback to mock data
- **Supabase Integration**: Database storage for search results and user data
- **Optimized for Figma**: Designed to work seamlessly with Figma prototypes
- **Vercel Deployment**: Fast, scalable hosting with edge functions

## API Endpoints

### GET /api/ebay/search
Search eBay for products with real-time data fetching.

**Query Parameters:**
- `q`: Search query (required)
- `limit`: Number of results (optional, default: 10)

**Example:**
```
GET /api/ebay/search?q=iphone&limit=5
```

## Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `EBAY_CLIENT_ID`: eBay application client ID
- `EBAY_CLIENT_SECRET`: eBay application client secret
- `EBAY_DEV_ID`: eBay developer ID
- `EBAY_REFRESH_TOKEN`: eBay refresh token

## Development

```bash
npm install
npm run dev
```

## Deployment

This project is designed to be deployed to Vercel as an API-only service.

## Architecture

- **Frontend**: Hosted on Figma
- **Backend**: This API service on Vercel
- **Database**: Supabase
- **External APIs**: eBay Browse API
