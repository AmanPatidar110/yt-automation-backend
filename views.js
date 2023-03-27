import axios from "axios";
import createPage, {
  createPageFromContext,
  getBrowser,
} from "./Utility/getPage.js";

const getViews = async () => {
  while (true) {
    // for (let i = 0; i < 10; i++) {
    console.log("Launching browser");
    const browser = await getBrowser();
    const options = {
      method: "GET",
      url: "https://proxypage1.p.rapidapi.com/v1/tier1random",
      params: { type: "HTTP", country: "US" },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-RapidAPI-Key": "ec024eb781msh6ddf7d7b6e847e1p177749jsn56cc0a2f9572",
        "X-RapidAPI-Host": "proxypage1.p.rapidapi.com",
      },
    };
    const response = await axios(options);
    const proxy = `${response.data[0].ip}:${response.data[0].port}`;
    console.log("Proxy: ", proxy);

    const context = await browser.createIncognitoBrowserContext({
      proxy,
    });

    const links = [
      "https://youtube.com/shorts/6FWayFaehlA?feature=share",
      "https://www.youtube.com/shorts/qTvKkQLG098",
      "https://www.youtube.com/shorts/ResSUb2I9qc",
      "https://www.youtube.com/shorts/lAPL8nxRpg4",
      "https://www.youtube.com/shorts/Nx52xgTv-O0",
      "https://www.youtube.com/shorts/OxcwSld8l8o",
      "https://www.youtube.com/shorts/Zyjt45yLaO4",
      "https://www.youtube.com/shorts/JOUt51BfOUw",
      "https://www.youtube.com/shorts/WienhZ_RDg4",
      "https://www.youtube.com/shorts/7aMnvEpuVGs",
    ];

    for (let i = 0; i < links.length; i++) {
      console.log("Launching page");
      const page = await createPageFromContext(context);

      await page.goto(links[i]);
      await page.waitForSelector(
        "#shorts-player > div:nth-child(6) > div:nth-child(1)"
      );
      await page.click("#shorts-player > div:nth-child(6) > div:nth-child(1)");
      await page.waitForTimeout(50000);

      console.log("Browser closed");
    }
    await context.close();
    await browser.close();
  }
};

getViews();
