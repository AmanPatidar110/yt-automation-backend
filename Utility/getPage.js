// Enable stealth mode
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import chromium from 'chromium';
puppeteer.use(StealthPlugin());

const USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';

export const getBrowser = async () => {
    const MainBrowser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true,
        executablePath: chromium.path,
        args: [
            // '--no-sandbox',
            '--disable-gpu',
            '--enable-webgl',
            '--start-maximized',
            // '--disable-setuid-sandbox',
        ],
    });
    return MainBrowser;
};

export default async function createPage(MainBrowser) {
    //  Randomize User agent or Set a valid one
    const page = await MainBrowser.newPage();

    await page.setViewport({ width: 1280, height: 720 });

    await page.setUserAgent(USER_AGENT);
    await page.setJavaScriptEnabled(true);
    await page.setDefaultNavigationTimeout(60000);

    await page.evaluateOnNewDocument(() => {
        //  Pass webdriver check
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
    });

    await page.evaluateOnNewDocument(() => {
        //  Pass chrome check
        window.chrome = {
            runtime: {},
            //  etc.
        };
    });

    await page.evaluateOnNewDocument(() => {
        //  Overwrite the `languages` property to use a custom getter.
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
    });

    return page;
}
