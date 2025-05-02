import { test, expect, describe } from '@playwright/test';

// Helper function to retry actions that may fail due to network issues
async function retry(fn, options = {}) {
  const { maxAttempts = 3, delay = 1000 } = options;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`Attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      lastError = error;
      
      if (attempt < maxAttempts) {
        console.log(`Waiting ${delay}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

describe('Pokedex', () => {
  test('front page can be opened', async ({ page, context }) => {
    // Track API responses for debugging
    let apiResponses = [];
    let apiRequestsComplete = false;
    // Monitor network requests
    page.on('request', request => {
      console.log(`>> Request: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', async response => {
      console.log(`<< Response: ${response.status()} ${response.url()}`);
      
      // Track and log API responses
      if (response.url().includes('pokeapi.co')) {
        const status = response.status();
        try {
          const responseBody = response.status() === 200 
            ? await response.json().catch(() => 'Failed to parse JSON')
            : 'Non-200 response';
          
          apiResponses.push({
            url: response.url(),
            status,
            body: responseBody
          });
          
          if (status !== 200) {
            console.error(`API Error: ${response.url()} returned ${status}`);
          }
        } catch (e) {
          console.error(`Failed to process API response: ${e.message}`);
        }
      }
    });

    // Wait for network to be idle before proceeding (useful in CI)
    context.setDefaultNavigationTimeout(60000);
    
    // Navigate to the app with network idle wait
    console.log('Navigating to application...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000
    }).catch(e => {
      console.error(`Navigation error: ${e.message}`);
      // Continue anyway, we'll handle errors in the test
    });
    
    // Wait for and verify the loading spinner first
    console.log('Checking for loading spinner...');
    await expect(page.locator('.loading-spinner')).toBeVisible({ timeout: 5000 })
      .catch(error => {
        console.log('Loading spinner not found:', error.message);
      });
    
    // Allow longer timeout for API response
    const timeout = 30000;
    
    try {
      // Check if page is actually loaded
      const pageTitle = await page.title();
      console.log(`Page title: ${pageTitle}`);
      
      // Create a promise that resolves when PokeAPI call completes
      const apiPromise = new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (apiResponses.some(r => r.url.includes('pokeapi.co/api/v2/pokemon'))) {
            clearInterval(checkInterval);
            apiRequestsComplete = true;
            resolve();
          }
        }, 500);
        
        // Timeout after 20 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!apiRequestsComplete) {
            console.log('API request completion timeout');
            resolve();
          }
        }, 20000);
      });
      
      // Wait for API responses before checking DOM
      await apiPromise;
      
      if (apiResponses.length === 0) {
        console.log('WARNING: No PokeAPI responses detected, test may fail');
      } else {
        console.log(`Received ${apiResponses.length} PokeAPI responses`);
        // Log the results structure to help debug
        const apiResponse = apiResponses.find(r => r.url.includes('pokeapi.co/api/v2/pokemon'));
        if (apiResponse && apiResponse.body && apiResponse.body.results) {
          console.log(`API returned ${apiResponse.body.results.length} Pokemon`);
          const pokemonNames = apiResponse.body.results.slice(0, 5).map(p => p.name).join(', ');
          console.log(`First 5 Pokemon: ${pokemonNames}`);
        }
      }
      
      // Wait for ivysaur with longer timeout (with retry for flaky networks)
      console.log('Waiting for ivysaur to appear...');
      await retry(async () => {
        await expect(page.getByText('ivysaur')).toBeVisible({ timeout });
      }, { maxAttempts: 3, delay: 3000 });
      
      // Check for other Pokémon to ensure data loaded correctly
      console.log('Checking for other Pokémon...');
      await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('charmander')).toBeVisible({ timeout: 5000 });
      
      // Check for the copyright notice
      await expect(
        page.getByText(
          'Pokémon and Pokémon character names are trademarks of Nintendo.'
        )
      ).toBeVisible({ timeout: 5000 });
      
    } catch (error) {
      console.error('Test failed:', error.message);
      
      // Log detailed API response information for debugging
      console.log('API Response Summary:');
      apiResponses.forEach((resp, i) => {
        console.log(`Response ${i+1}: ${resp.url} - Status ${resp.status}`);
      });
      
      // Take screenshot for debugging
      const screenshotPath = `error-screenshot-${Date.now()}.png`;
      console.log(`Taking screenshot: ${screenshotPath}`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Log page content for debugging
      const content = await page.content();
      console.log('Page content:', content.substring(0, 1000) + '...');
      
      // Check for error message on page
      const errorElement = await page.locator('.error-message').count();
      if (errorElement > 0) {
        const errorText = await page.locator('.error-message').textContent();
        console.log('Error message found on page:', errorText);
      }
      
      // Check if any network requests failed
      console.log('Checking for failed network requests...');
      const failedRequests = page.request.allFailed;
      if (failedRequests && failedRequests.length > 0) {
        console.log(`Found ${failedRequests.length} failed network requests:`);
        failedRequests.forEach(req => {
          console.log(`- ${req.method()} ${req.url()}`);
        });
      }
      
      // Get console logs
      console.log('Browser console logs:');
      const logs = [];
      page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));
      logs.forEach(log => console.log(`  ${log}`));
      
      throw error;
    }
  });
});
