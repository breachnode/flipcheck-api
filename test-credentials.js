// Test script to verify credentials work locally
const SUPABASE_URL = 'https://ckonyavwszssfkmvoxll.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb255YXZ3c3pzc2ZrbXZveGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjE0NTEyMiwiZXhwIjoyMDcxNzIxMTIyfQ.tnkLGS6Ma8qXIhTI8zaSozml7K3_PopAzuqXuN8Y-j0';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb255YXZ3c3pzc2ZrbXZveGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDUxMjIsImV4cCI6MjA3MTcyMTEyMn0.oRknIYNBHJS9NAcb3zfK7X0mdHfh3TWMR887Ifh1Rvw';

const EBAY_CLIENT_ID = 'Breachnode-FlipChec-PRD-e8e894d8b-7bc87b82';
const EBAY_CLIENT_SECRET = 'PRD-8e894d8b3560-acf6-43f2-9166-de8f';
const EBAY_DEV_ID = '8fd36894-05e4-42d6-9ea0-24ceb95c5e34';
const EBAY_REFRESH_TOKEN = 'v^1.1#i^1#r^1#f^0#p^3#I^3#t^Ul4xMF82OkE5N0YxRUE3ODAxRjcwQjFCMDBERTJFXzFfMSNFXjI2MA==';

async function testCredentials() {
  try {
    console.log('🧪 Testing credentials locally...\n');
    
    // Test 1: Supabase Connection
    console.log('🔍 Test 1: Supabase Connection...');
    try {
      const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/alerts?select=count`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      
      if (supabaseResponse.ok) {
        console.log('✅ Supabase connection successful!');
      } else {
        console.log('❌ Supabase connection failed:', supabaseResponse.status);
      }
    } catch (error) {
      console.log('❌ Supabase error:', error.message);
    }
    
    // Test 2: eBay Token Request
    console.log('\n🔍 Test 2: eBay Token Request...');
    try {
      const tokenResponse = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`)
        },
        body: new URLSearchParams({
          'grant_type': 'refresh_token',
          'refresh_token': EBAY_REFRESH_TOKEN
        })
      });
      
      console.log('📡 Token response status:', tokenResponse.status);
      
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        console.log('✅ eBay token successful! Length:', tokenData.access_token?.length || 0);
        
        // Test 3: eBay Live Search
        console.log('\n🔍 Test 3: eBay Live Search...');
        const searchResponse = await fetch('https://api.ebay.com/buy/browse/v1/item_summary/search?q=iphone&limit=3', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY-US'
          }
        });
        
        console.log('📡 Search response status:', searchResponse.status);
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          console.log('✅ eBay search successful!');
          console.log('📊 Found items:', searchData.total || 0);
          
          if (searchData.itemSummaries && searchData.itemSummaries.length > 0) {
            console.log('📱 First item:', searchData.itemSummaries[0].title);
            console.log('💰 Price:', searchData.itemSummaries[0].price?.value, searchData.itemSummaries[0].price?.currency);
            console.log('🏪 Seller:', searchData.itemSummaries[0].seller?.username);
          }
        } else {
          const errorText = await searchResponse.text();
          console.error('❌ Search failed:', errorText);
        }
      } else {
        const errorText = await tokenResponse.text();
        console.error('❌ Token failed:', errorText);
      }
    } catch (error) {
      console.error('❌ eBay API error:', error.message);
    }
    
    console.log('\n🎯 Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCredentials();
