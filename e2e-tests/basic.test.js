import { test, expect, describe } from '@playwright/test';

describe('Pokedex', () => {
  test('front page can be opened', async ({ page }) => {
    // Monitor network requests
    page.on('request', request => {
      console.log(`>> Request: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      console.log(`<< Response: ${response.status()} ${response.url()}`);
    });

    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for and verify the loading spinner first
    console.log('Checking for loading spinner...');
    await expect(page.locator('.loading-spinner')).toBeVisible({ timeout: 5000 })
      .catch(error => {
        console.log('Loading spinner not found:', error.message);
      });
    
    // Allow longer timeout for API response
    const timeout = 30000;
    
    try {
      // Wait for ivysaur with longer timeout
      console.log('Waiting for ivysaur to appear...');
      await expect(page.getByText('ivysaur')).toBeVisible({ timeout });
      
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
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'error-screenshot.png' });
      
      // Log page content for debugging
      const content = await page.content();
      console.log('Page content:', content.substring(0, 1000) + '...');
      
      // Check for error message on page
      const errorElement = await page.locator('.error-message').count();
      if (errorElement > 0) {
        const errorText = await page.locator('.error-message').textContent();
        console.log('Error message found on page:', errorText);
      }
      
      throw error;
    }
  });
});
