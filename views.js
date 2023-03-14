import createPage, { getBrowser } from "./Utility/getPage.js";

const getViews = async () => {
  const browsers = [];
  while (true) {
    // for (let i = 0; i < 10; i++) {
    console.log("Launching browser");
    const browser = await getBrowser();
    browsers.push(browser);
    console.log("Launching page");
    const page = await createPage(browser);

    await page.goto("https://youtube.com/shorts/J7yf2ZhAxqI?feature=share");
    await page.waitForSelector(
      "#shorts-player > div:nth-child(6) > div:nth-child(1)"
    );
    await page.click("#shorts-player > div:nth-child(6) > div:nth-child(1)");
    await page.waitForTimeout(14000);
    browser.close();
    // }

    // const timeout = (ms) =>
    //   new Promise((res) =>
    //     setTimeout(() => {
    //       res();
    //     }, ms)
    //   );
    // await timeout(15000);
    // await Promise.all(browsers.map((browser) => browser.close()));
  }
};

getViews();
