const { executablePath } = require("puppeteer");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

async function scrollPage(page, scrollElements) {
  let currentElement = 0;
  while (true) {
    let elementsLength = await page.evaluate((scrollElements) => {
      return document.querySelectorAll(scrollElements).length;
    }, scrollElements);
    for (; currentElement < elementsLength; currentElement++) {
      await page.waitForTimeout(200);
      await page.evaluate(
        (currentElement, scrollElements) => {
          document
            .querySelectorAll(scrollElements)
            [currentElement].scrollIntoView();
        },
        currentElement,
        scrollElements
      );
    }
    await page.waitForTimeout(1000);
    let newElementsLength = await page.evaluate((scrollElements) => {
      return document.querySelectorAll(scrollElements).length;
    }, scrollElements);
    if (newElementsLength === elementsLength) break;
  }
}

async function fillDataFromPage(page, requestParams) {
  const dataFromPage = await page.evaluate((requestParams) => {
    return Array.from(
      document.querySelectorAll("#contents > ytd-video-renderer")
    ).map((el) => ({
      title: el.querySelector("a#video-title")?.textContent.trim(),
      link: `${requestParams.baseURL}${el
        .querySelector("a#thumbnail")
        ?.getAttribute("href")}`,
      channel: {
        name: el
          .querySelector("#channel-info #channel-name a")
          ?.textContent.trim(),
        link: `${requestParams.baseURL}${el
          .querySelector("#channel-info > a")
          ?.getAttribute("href")}`,
        thumbnail: el
          .querySelector("#channel-info > a #img")
          ?.getAttribute("src"),
      },
      thumbnail: el.querySelector("a#thumbnail img")?.getAttribute("src"),
      publishedDate: el
        .querySelectorAll("#metadata-line > span")[1]
        ?.textContent.trim(),
      views: el
        .querySelectorAll("#metadata-line > span")[0]
        ?.textContent.trim(),
      length: el
        .querySelector("span.ytd-thumbnail-overlay-time-status-renderer")
        ?.textContent.trim(),
      description: el
        .querySelector(".metadata-snippet-container > yt-formatted-string")
        ?.textContent.trim(),
      extensions: Array.from(el.querySelectorAll("#badges .badge")).map((el) =>
        el.querySelector("span")?.textContent.trim()
      ),
    }));
  }, requestParams);
  return dataFromPage;
}

exports.getYoutubeOrganicResults = async (searchString) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: executablePath(),
  });

  const page = await browser.newPage();

  const requestParams = {
    baseURL: `https://www.youtube.com`,
    encodedQuery: encodeURI(searchString),
  };

  const URL = `${requestParams.baseURL}/results?search_query=${requestParams.encodedQuery}&sp=EgIQAQ%253D%253D`;

  await page.setDefaultNavigationTimeout(60000);
  await page.goto(URL);

  await page.waitForSelector("#contents > ytd-video-renderer");
  await page.waitForSelector("a#thumbnail img");

  const scrollElements = "#contents > ytd-video-renderer";
  console.log("scrollElements", scrollElements);

  // await scrollPage(page, scrollElements);
  console.log("scrollPage: DONE");

  await page.waitForTimeout(5000);

  const organicResults = await fillDataFromPage(page, requestParams);

  await browser.close();
  console.log("browser closed", organicResults);
  return organicResults;
};
