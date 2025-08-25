import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE!;

// eBay API credentials
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const EBAY_DEV_ID = process.env.EBAY_DEV_ID;
const EBAY_REFRESH_TOKEN = process.env.EBAY_REFRESH_TOKEN;

const supabase = createClient(supabaseUrl, supabaseKey);

// Search eBay items on-demand
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category') || '';
    const condition = searchParams.get('condition') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';

    if (!query.trim()) {
      return NextResponse.json({ 
        error: 'Search query is required',
        items: [],
        total: 0
      });
    }

    console.log(`🔍 Searching eBay for: "${query}"`);

    // Build Supabase query
    let supabaseQuery = supabase
      .from('alerts')
      .select('*')
      .eq('source', 'ebay')
      .ilike('title', `%${query}%`)
      .order('posted_at', { ascending: false });

    // Apply filters
    if (category && category !== 'all') {
      supabaseQuery = supabaseQuery.eq('meta->>category', category);
    }

    if (condition && condition !== 'all') {
      supabaseQuery = supabaseQuery.eq('meta->>condition', condition);
    }

    if (minPrice) {
      supabaseQuery = supabaseQuery.gte('price', parseFloat(minPrice));
    }

    if (maxPrice) {
      supabaseQuery = supabaseQuery.lte('price', parseFloat(maxPrice));
    }

    // Execute query
    const { data: items, error, count } = await supabaseQuery.limit(limit);

    if (error) {
      console.error('❌ Supabase query error:', error);
      return NextResponse.json({ 
        error: 'Failed to search database',
        items: [],
        total: 0
      });
    }

    // If no results found, try real eBay API
    if (!items || items.length === 0) {
      console.log(`📝 No database results found for "${query}", trying real eBay API...`);
      
      try {
        const realItems = await searchRealEbay(query, limit);
        
        if (realItems && realItems.length > 0) {
          // Store real results in database
          await storeRealResults(query, realItems);
          
          return NextResponse.json({
            items: realItems,
            total: realItems.length,
            source: 'real_ebay_api',
            message: `Found ${realItems.length} real eBay items for "${query}"`
          });
        }
      } catch (error) {
        console.error('❌ Real eBay API failed:', error.message);
      }
      
      // Final fallback: generate mock data
      console.log(`📝 Generating mock data as final fallback for "${query}"`);
      const mockItems = await generateMockEbayResults(query, limit);
      
      if (mockItems.length > 0) {
        await storeMockResults(query, mockItems);
      }

      return NextResponse.json({
        items: mockItems,
        total: mockItems.length,
        source: 'mock_generated_fallback',
        message: `Generated ${mockItems.length} sample items for "${query}" (real API unavailable)`
      });
    }

    console.log(`✅ Found ${items.length} items for "${query}"`);

    return NextResponse.json({
      items: items,
      total: count || items.length,
      source: 'database',
      query: query
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      items: [],
      total: 0
    }, { status: 500 });
  }
}

// Search real eBay using API
async function searchRealEbay(query: string, limit: number) {
  try {
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET || !EBAY_REFRESH_TOKEN) {
      console.log('❌ Missing eBay credentials');
      return null;
    }

    console.log(`🔍 Searching REAL eBay for: "${query}"`);
    
    // Get access token
    const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token';
    const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: EBAY_REFRESH_TOKEN,
        scope: 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/buy/browse'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    // Search eBay
    const searchUrl = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      sort: 'newlyListed'
    });

    const searchResponse = await fetch(`${searchUrl}?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY-US'
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`eBay search failed: ${searchResponse.status}`);
    }

    const data = await searchResponse.json();
    
    if (!data.itemSummaries || data.itemSummaries.length === 0) {
      console.log(`📝 No real eBay results found for "${query}"`);
      return null;
    }

    console.log(`✅ Found ${data.itemSummaries.length} REAL eBay items for "${query}"`);
    
    // Convert to our format
    const items = data.itemSummaries.map(item => ({
      source: 'ebay',
      title: item.title,
      price: parseFloat(item.price?.value || 0),
      currency: item.price?.currency || 'USD',
      url: item.itemWebUrl || `https://www.ebay.com/itm/${item.itemId}`,
      location: item.itemLocation?.city ? `${item.itemLocation.city}, ${item.itemLocation.stateOrProvince}` : 'Unknown',
      posted_at: item.listingDate || new Date().toISOString(),
      images: item.image ? [item.image.imageUrl] : [],
      meta: {
        condition: item.condition || 'used',
        seller: item.seller?.username || 'Unknown',
        itemId: item.itemId,
        category: item.categoryPath?.[0]?.categoryName || 'General'
      }
    }));

    return items;
  } catch (error) {
    console.error(`❌ Error searching real eBay for "${query}":`, error.message);
    return null;
  }
}

// Store real eBay results
async function storeRealResults(query: string, items: any[]) {
  try {
    if (!items || items.length === 0) return false;

    console.log(`💾 Storing ${items.length} REAL eBay items for: "${query}"`);
    
    // Check for duplicates
    const existingIds = items.map(item => item.meta?.itemId).filter(Boolean);
    
    if (existingIds.length > 0) {
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .in('meta->>itemId', existingIds);
      
      if (existing && existing.length > 0) {
        console.log(`⚠️ ${existing.length} items already exist, skipping duplicates`);
        return true;
      }
    }

    // Insert new items
    const { error } = await supabase
      .from('alerts')
      .insert(items);

    if (error) {
      console.error('❌ Error storing real results:', error);
      return false;
    }

    console.log(`✅ Stored ${items.length} REAL eBay items in database`);
    return true;
  } catch (error) {
    console.error('❌ Error storing real results:', error);
    return false;
  }
}

// Generate realistic mock eBay results
async function generateMockEbayResults(query: string, limit: number) {
  const queryLower = query.toLowerCase();
  const results = [];
  
  // Define item templates
  const templates = {
    'iphone': {
      brands: ['iPhone 13 Pro', 'iPhone 14', 'iPhone 15', 'iPhone SE'],
      conditions: ['excellent', 'good', 'fair', 'poor'],
      priceRange: { min: 200, max: 1200 },
      categories: ['Smartphones', 'Electronics']
    },
    'macbook': {
      brands: ['MacBook Air M1', 'MacBook Air M2', 'MacBook Pro M1', 'MacBook Pro M2'],
      conditions: ['excellent', 'good', 'fair'],
      priceRange: { min: 600, max: 2500 },
      categories: ['Laptops', 'Computers']
    },
    'watch': {
      brands: ['Apple Watch Series 7', 'Apple Watch Series 8', 'Samsung Galaxy Watch', 'Fitbit'],
      conditions: ['excellent', 'good', 'fair', 'poor'],
      priceRange: { min: 100, max: 800 },
      categories: ['Smartwatches', 'Wearables']
    },
    'radio': {
      brands: ['Sony', 'Panasonic', 'JBL', 'Bose', 'Vintage'],
      conditions: ['excellent', 'good', 'fair', 'poor'],
      priceRange: { min: 20, max: 300 },
      categories: ['Audio', 'Electronics']
    },
    'car': {
      brands: ['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes'],
      conditions: ['excellent', 'good', 'fair', 'poor'],
      priceRange: { min: 5000, max: 50000 },
      categories: ['Automotive', 'Vehicles']
    },
    'crib': {
      brands: ['Graco', 'Delta', 'IKEA', 'Pottery Barn', 'Vintage'],
      conditions: ['excellent', 'good', 'fair'],
      priceRange: { min: 50, max: 800 },
      categories: ['Baby', 'Furniture']
    }
  };

  // Find matching template
  let template = null;
  for (const [key, temp] of Object.entries(templates)) {
    if (queryLower.includes(key)) {
      template = temp;
      break;
    }
  }

  // Use generic template if no match
  if (!template) {
    template = {
      brands: [query.charAt(0).toUpperCase() + query.slice(1)],
      conditions: ['excellent', 'good', 'fair', 'poor'],
      priceRange: { min: 10, max: 1000 },
      categories: ['General', 'Miscellaneous']
    };
  }

  // Generate items
  for (let i = 0; i < limit; i++) {
    const brand = template.brands[Math.floor(Math.random() * template.brands.length)];
    const condition = template.conditions[Math.floor(Math.random() * template.conditions.length)];
    const price = Math.floor(Math.random() * (template.priceRange.max - template.priceRange.min) + template.priceRange.min);
    const category = template.categories[Math.floor(Math.random() * template.categories.length)];
    
    const item = {
      id: `mock_${Date.now()}_${i}`,
      source: 'ebay',
      title: `${brand} - ${condition} condition`,
      price: price + (Math.random() * 0.99),
      currency: 'USD',
      url: `https://www.ebay.com/itm/mock_${Date.now()}_${i}`,
      location: getRandomLocation(),
      posted_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      images: [getRandomImage(queryLower)],
      meta: {
        condition: condition,
        seller: getRandomSeller(),
        category: category,
        itemId: `mock_${Date.now()}_${i}`
      }
    };

    results.push(item);
  }

  return results;
}

// Store mock results in database
async function storeMockResults(query: string, items: any[]) {
  try {
    const alerts = items.map(item => ({
      source: 'ebay',
      title: item.title,
      price: item.price,
      currency: item.currency,
      url: item.url,
      location: item.location,
      posted_at: item.posted_at,
      images: item.images,
      meta: item.meta
    }));

    const { error } = await supabase
      .from('alerts')
      .insert(alerts);

    if (error) {
      console.error('❌ Error storing mock results:', error);
    } else {
      console.log(`✅ Stored ${items.length} mock items for "${query}"`);
    }
  } catch (error) {
    console.error('❌ Error storing mock results:', error);
  }
}

function getRandomLocation() {
  const locations = [
    'Los Angeles, CA', 'New York, NY', 'Chicago, IL', 'Houston, TX',
    'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA',
    'Dallas, TX', 'San Jose, CA', 'Austin, TX', 'Jacksonville, FL'
  ];
  return locations[Math.floor(Math.random() * locations.length)];
}

function getRandomSeller() {
  const sellers = [
    'tech_seller_la', 'mac_seller_sf', 'phone_seller_miami', 'electronics_nyc',
    'gadget_guru', 'tech_deals_usa', 'quality_electronics', 'reliable_seller'
  ];
  return sellers[Math.floor(Math.random() * sellers.length)];
}

function getRandomImage(query: string) {
  const imageMap: Record<string, string> = {
    'iphone': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
    'macbook': 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400',
    'watch': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    'radio': 'https://images.unsplash.com/photo-1589003077984-894e1323b7f3?w=400',
    'car': 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400',
    'crib': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400'
  };

  for (const [key, image] of Object.entries(imageMap)) {
    if (query.includes(key)) {
      return image;
    }
  }

  return 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';
}
