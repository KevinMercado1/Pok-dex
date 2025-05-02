import { test, expect, describe } from '@playwright/test';

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
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

describe('Pokedex', () => {
  test('front page can be opened', async ({ page, context }) => {
    const apiResponses = [];
    const consoleLogs = [];
    let apiRequestsComplete = false;

    // Monitor console logs
    page.on('console', (msg) => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });

    // Monitor failed network requests
    const failedRequests = [];
    page.on('requestfailed', (request) => {
      failedRequests.push(request);
      console.error(`❌ Request failed: ${request.method()} ${request.url()}`);
    });

    // Monitor requests
    page.on('request', (request) => {
      console.log(`>> Request: ${request.method()} ${request.url()}`);
    });

    page.on('response', async (response) => {
      console.log(`<< Response: ${response.status()} ${response.url()}`);

      if (response.url().includes('pokeapi.co')) {
        const status = response.status();
        try {
          const responseBody =
            status === 200
              ? await response.json().catch(() => 'Failed to parse JSON')
              : 'Non-200 response';

          apiResponses.push({
            url: response.url(),
            status,
            body: responseBody,
          });

          if (status !== 200) {
            console.error(`API Error: ${response.url()} returned ${status}`);
          }
        } catch (e) {
          console.error(`Failed to process API response: ${e.message}`);
        }
      }
    });

    context.setDefaultNavigationTimeout(60000);

    try {
      console.log('Navigating to application...');
      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle',
        timeout: 60000,
      });

      console.log('Checking for loading spinner...');
      await expect(page.locator('.loading-spinner'))
        .toBeVisible({ timeout: 5000 })
        .catch((err) => {
          console.log('Loading spinner not found:', err.message);
        });

      const apiPromise = new Promise((resolve) => {
        const interval = setInterval(() => {
          if (apiResponses.some((r) => r.url.includes('pokemon'))) {
            clearInterval(interval);
            apiRequestsComplete = true;
            resolve();
          }
        }, 500);

        setTimeout(() => {
          clearInterval(interval);
          if (!apiRequestsComplete) {
            console.warn('API request completion timeout');
            resolve();
          }
        }, 20000);
      });

      await apiPromise;

      if (apiResponses.length === 0) {
        console.warn('WARNING: No PokeAPI responses detected');
      } else {
        console.log(`Received ${apiResponses.length} PokeAPI responses`);
        const pokemonList = apiResponses.find((r) => r.url.includes('pokemon'));

        if (pokemonList?.body?.results) {
          const names = pokemonList.body.results
            .slice(0, 5)
            .map((p) => p.name)
            .join(', ');
          console.log(`First 5 Pokémon: ${names}`);
        }
      }

      console.log('Waiting for ivysaur...');
      await retry(
        async () => {
          await expect(page.getByText('ivysaur')).toBeVisible({
            timeout: 30000,
          });
        },
        { maxAttempts: 3, delay: 3000 }
      );

      await expect(page.getByText('bulbasaur')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('charmander')).toBeVisible({ timeout: 5000 });

      await expect(
        page.getByText(
          'Pokémon and Pokémon character names are trademarks of Nintendo.'
        )
      ).toBeVisible({ timeout: 5000 });
    } catch (error) {
      console.error('Test failed:', error.message);

      const screenshotPath = `error-screenshot-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      const content = await page.content();
      console.log(
        ' Page content (first 1000 chars):',
        content.slice(0, 1000),
        '...'
      );

      const errorElement = await page.locator('.error-message');
      if (await errorElement.count()) {
        const errorText = await errorElement.textContent();
        console.log(' Error message on page:', errorText);
      }

      if (failedRequests.length > 0) {
        console.log(`${failedRequests.length} failed network requests:`);
        failedRequests.forEach((req) => {
          console.log(` ${req.method()} ${req.url()}`);
        });
      }

      console.log('Browser console logs:');
      consoleLogs.forEach((log) => console.log(`  ${log}`));

      throw error;
    }
  });
});
