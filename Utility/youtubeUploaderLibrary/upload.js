import fs from "fs";
import path from "path";

import StealthPlugin from "puppeteer-extra-plugin-stealth";
import createPage from "../getPage.js";
StealthPlugin().enabledEvasions.delete("iframe.contentWindow");
StealthPlugin().enabledEvasions.delete("navigator.plugins");

const ProgressEnum = {
  Uploading: "Uploading",
  Processing: "Processing",
  Done: "Done",
};
const maxTitleLen = 100;
const maxDescLen = 5000;

const timeout = 60000;

const browsers = {};
const pages = {};
let cookiesDirPath;
let cookiesFilePath;

const invalidCharacters = ["<", ">"];

const uploadURL = "https://www.youtube.com/upload";
const homePageURL = "https://www.youtube.com";

/**
 * import { upload } from 'youtube-videos-uploader'
 * or
 * const { upload } from 'youtube-videos-uploader');
 */
export const upload = async (
  credentials,
  videos = [],
  browser,
  messageTransport
) => {
  const email = credentials.email;
  cookiesDirPath = path.join(".", "yt-auth");
  cookiesFilePath = path.join(
    cookiesDirPath,
    `cookies-${email.split("@")[0].replace(/\./g, "_")}-${email
      .split("@")[1]
      .replace(/\./g, "_")}.json`
  );
  browsers[email] = browser;
  await launchBrowser(email, messageTransport);
  messageTransport.log("Loading Account");
  await loadAccount(credentials, messageTransport);
  messageTransport.log("Account loaded, video to upload:" + videos.length);
  const uploadedYTLink = [];

  let link;
  for (const video of videos) {
    try {
      link = await uploadVideo(video, email, messageTransport);
    } catch (error) {
      messageTransport.log(error.message || error);
      console.log(error);
      if (browsers[email]) {
        continue;
      } else {
        break;
      }
    }

    const { onSuccess } = video;
    if (typeof onSuccess === "function") {
      onSuccess(link);
    }

    uploadedYTLink.push(link);
  }

  await browsers[email].close();

  return uploadedYTLink;
};

// 'videoJSON = {}', avoid 'videoJSON = undefined' throw error.
async function uploadVideo(videoJSON, email, messageTransport) {
  const page = pages[email];
  messageTransport.log("Uploading video with title: " + videoJSON.title);
  const pathToFile = videoJSON.path;
  if (!pathToFile) {
    throw new Error(
      ": function 'upload''s second param 'videos''s item 'video' must include 'path' property."
    );
  }
  videoJSON.title = videoJSON.title.replaceAll("<", "");
  videoJSON.title = videoJSON.title.replaceAll(">", "");
  for (const i in invalidCharacters) {
    if (videoJSON.title.includes(invalidCharacters[i])) {
      throw new Error(
        ` "${videoJSON.title}" includes a character not allowed in youtube titles (${invalidCharacters[i]})`
      );
    }
  }
  if (videoJSON.channelName) {
    messageTransport.log("Changing channel to: " + videoJSON.channelName);

    await changeChannel(videoJSON.channelName, email);
  }

  videoJSON.description = videoJSON.description.replaceAll("<", "");
  videoJSON.description = videoJSON.description.replaceAll(">", "");

  const title = videoJSON.title;
  const description = videoJSON.description;
  const tags = videoJSON.tags;

  // For backward compatablility playlist.name is checked first
  const playlistName = videoJSON.playlist;
  const videoLang = videoJSON.language;
  const thumb = videoJSON.thumbnail;
  const uploadAsDraft = videoJSON.uploadAsDraft;
  await page.evaluate(() => {
    window.onbeforeunload = null;
  });
  await page.goto(uploadURL);

  const closeBtnXPath = "//*[normalize-space(text())='Close']";
  const selectBtnXPath = "//*[normalize-space(text())='Select files']";
  const saveCloseBtnXPath = '//*[@aria-label="Save and close"]/tp-yt-iron-icon';
  const createBtnXPath = '//*[@id="create-icon"]/tp-yt-iron-icon';
  const addVideoBtnXPath =
    '//*[@id="text-item-0"]/ytcp-ve/div/div/yt-formatted-string';
  if (
    await page.waitForXPath(createBtnXPath, { timeout: 5000 }).catch(() => null)
  ) {
    const createBtn = await page.$x(createBtnXPath);
    await createBtn[0].click();
  }
  if (
    await page
      .waitForXPath(addVideoBtnXPath, { timeout: 5000 })
      .catch(() => null)
  ) {
    const addVideoBtn = await page.$x(addVideoBtnXPath);
    await addVideoBtn[0].click();
  }
  for (let i = 0; i < 2; i++) {
    try {
      await page.waitForXPath(selectBtnXPath);
      await page.waitForXPath(closeBtnXPath);
      break;
    } catch (error) {
      messageTransport.log(error.message || error);
      console.log(error);
      const nextText = i === 0 ? " trying again" : " failed again";
      messageTransport.log("Failed to find the select files button" + nextText);
      messageTransport.log(error.message || error);
      console.log(error);
      await page.evaluate(() => {
        window.onbeforeunload = null;
      });
      await page.goto(uploadURL);
    }
  }
  // Remove hidden closebtn text
  const closeBtn = await page.$x(closeBtnXPath);
  await page.evaluate((el) => {
    el.textContent = "oldclosse";
  }, closeBtn[0]);

  const selectBtn = await page.$x(selectBtnXPath);
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    selectBtn[0].click(), // button that triggers file selection
  ]);
  messageTransport.log("Choosing file: " + pathToFile);
  await fileChooser.accept([pathToFile]);
  // Setup onProgress
  let progressChecker;
  let progress = { progress: 0, stage: ProgressEnum.Uploading };
  if (videoJSON.onProgress) {
    videoJSON.onProgress(progress);
    progressChecker = setInterval(async () => {
      let curProgress = await page.evaluate(() => {
        const items = document.querySelectorAll(
          "span.progress-label.ytcp-video-upload-progress"
        );
        for (let i = 0; i < items.length; i++) {
          if (items.item(i).textContent.indexOf("%") === -1) continue;
          return items.item(i).textContent;
        }
      });
      if (progressChecker === undefined || !curProgress) return;
      curProgress = curProgress
        .split(" ")
        .find((txt) => txt.indexOf("%") !== -1);
      const newProgress = curProgress ? parseInt(curProgress.slice(0, -1)) : 0;
      if (progress.progress === newProgress) return;
      progress.progress = newProgress;
      videoJSON.onProgress(progress);
    }, 500);
  }

  const errorMessage = await page.evaluate(() =>
    document
      .querySelector(".error-area.style-scope.ytcp-uploads-dialog")
      ?.innerText.trim()
  );
  if (errorMessage) {
    await browsers[email].close();
    throw new Error("Youtube returned an error : " + errorMessage);
  }

  // Wait for upload to complete
  const uploadCompletePromise = page
    .waitForXPath(
      '//tp-yt-paper-progress[contains(@class,"ytcp-video-upload-progress-hover") and @value="100"]',
      { timeout: 0 }
    )
    .then(() => "uploadComplete");

  // Check if daily upload limit is reached
  const dailyUploadPromise = page
    .waitForXPath('//div[contains(text(),"Daily upload limit reached")]', {
      timeout: 0,
    })
    .then(() => "dailyUploadReached");
  const uploadResult = await Promise.any([
    uploadCompletePromise,
    dailyUploadPromise,
  ]);
  if (uploadResult === "dailyUploadReached") {
    browsers[email].close();
    throw new Error("Daily upload limit reached");
  }

  // Wait for upload to go away and processing to start, skip the wait if the user doesn't want it.
  if (!videoJSON.skipProcessingWait) {
    await page.waitForXPath('//*[contains(text(),"Video upload complete")]', {
      hidden: true,
      timeout: 0,
    });
  } else {
    await sleep(5000);
  }

  if (videoJSON.onProgress) {
    progress = { progress: 0, stage: ProgressEnum.Processing };
    videoJSON.onProgress(progress);
  }
  if (videoJSON.onProgress) {
    clearInterval(progressChecker);
    progressChecker = undefined;
    progress = { progress: 100, stage: ProgressEnum.Done };
    videoJSON.onProgress(progress);
  }

  // Wait until title & description box pops up
  if (thumb) {
    messageTransport.log("Uploading thumbnail...");
    const thumbnailChooserXpath = xpathTextSelector("upload thumbnail");
    await page.waitForXPath(thumbnailChooserXpath);
    const thumbBtn = await page.$x(thumbnailChooserXpath);
    const [thumbChooser] = await Promise.all([
      page.waitForFileChooser(),
      thumbBtn[0].click(), // button that triggers file selection
    ]);
    await thumbChooser.accept([thumb]);
  }
  await page.waitForFunction(
    "document.querySelectorAll('[id=\"textbox\"]').length > 1"
  );
  const textBoxes = await page.$x('//*[@id="textbox"]');
  await page.bringToFront();
  // Add the title value
  messageTransport.log("Adding title: " + title);
  await textBoxes[0].focus();
  await page.waitForTimeout(1000);
  await textBoxes[0].evaluate((e) => (e.__shady_native_textContent = ""));
  await textBoxes[0].type(title.substring(0, maxTitleLen));
  // Add the Description content
  messageTransport.log("Adding description...");
  await textBoxes[0].evaluate((e) => (e.__shady_native_textContent = ""));
  await textBoxes[1].type(description.substring(0, maxDescLen));

  const childOption = await page.$x('//*[contains(text(),"No, it\'s")]');
  await childOption[0].click();

  // There is no reason for this to be called. Also you should be using #toggle-button not going by the text...
  // const moreOption = await page.$x("//*[normalize-space(text())='Show more']")
  // await moreOption[0]?.click()

  const playlist = await page.$x("//*[normalize-space(text())='Select']");
  let createplaylistdone;
  if (playlistName) {
    messageTransport.log("Selecting playlist");

    // Selecting playlist
    for (let i = 0; i < 2; i++) {
      try {
        await page.evaluate((el) => el?.click(), playlist[0]);
        // Type the playlist name to filter out
        await page.waitForSelector("#search-input");
        await page.focus("#search-input");
        await page.type("#search-input", playlistName);

        const escapedPlaylistName = escapeQuotesForXPath(playlistName);
        const playlistToSelectXPath =
          "//*[normalize-space(text())=" + escapedPlaylistName + "]";
        await page.waitForXPath(playlistToSelectXPath, {
          timeout: 10000,
        });
        const playlistNameSelector = await page.$x(playlistToSelectXPath);
        await page.evaluate((el) => el?.click(), playlistNameSelector[0]);
        createplaylistdone = await page.$x(
          "//*[normalize-space(text())='Done']"
        );
        await page.evaluate((el) => el?.click(), createplaylistdone[0]);
        break;
      } catch (error) {
        messageTransport.log(error.message || error);
        console.log(error);
        // Creating new playlist
        // click on playlist dropdown
        await page.evaluate((el) => el?.click(), playlist[0]);
        // click New playlist button
        const newPlaylistXPath =
          "//*[normalize-space(text())='New playlist'] | //*[normalize-space(text())='Create playlist']";
        await page.waitForXPath(newPlaylistXPath);
        const createplaylist = await page.$x(newPlaylistXPath);
        await page.evaluate((el) => el?.click(), createplaylist[0]);
        // Enter new playlist name
        await page.keyboard.type(" " + playlistName.substring(0, 148));
        // click create & then done button
        const createplaylistbtn = await page.$x(
          "//*[normalize-space(text())='Create']"
        );
        await page.evaluate((el) => el?.click(), createplaylistbtn[1]);
        createplaylistdone = await page.$x(
          "//*[normalize-space(text())='Done']"
        );
        await page.evaluate((el) => el?.click(), createplaylistdone[0]);
      }
    }
  }

  messageTransport.log("Adding video configs: [isNotForKid, isAgeRestriction]");
  if (!videoJSON.isNotForKid) {
    await page
      .click("tp-yt-paper-radio-button[name='VIDEO_MADE_FOR_KIDS_MFK']")
      .catch(() => {});
  } else if (videoJSON.isAgeRestriction) {
    await page.$eval(
      "tp-yt-paper-radio-button[name='VIDEO_AGE_RESTRICTION_SELF']",
      (e) => e.click()
    );
  } else {
    await page
      .click("tp-yt-paper-radio-button[name='VIDEO_MADE_FOR_KIDS_NOT_MFK']")
      .catch(() => {});
  }
  // await page.waitForXPath('//ytcp-badge[contains(@class,"draft-badge")]//div[contains(text(),"Saved as private")]', { timeout: 0})

  // await page.click("#toggle-button")
  // Was having issues because of await page.$x("//*[normalize-space(text())='Show more']").click(), so I started messing with the line above.
  // The issue was obviously not the line above but I either way created code to ensure that Show more has been pressed before proceeding.
  const showMoreButton = await page.$("#toggle-button");
  if (showMoreButton === undefined) {
    throw new Error("uploadVideo - Toggle button not found.");
  } else {
    // messageTransport.log( "Show more start." )
    while (
      (await page.$("ytcp-video-metadata-editor-advanced")) === undefined
    ) {
      // messageTransport.log( "Show more while." )
      await showMoreButton.click();
      await sleep(1000);
    }
    await showMoreButton.click();
    await sleep(1000);
    messageTransport.log("Show more finished.");
  }

  // Add tags
  // if (tags) {
  //   messageTransport.log("Adding tags", tags);

  //   // show more
  //   try {
  //     await page.focus('[aria-label="Tags"]');
  //     await page.type(
  //       '[aria-label="Tags"]',
  //       tags
  //         .split(", ")
  //         .filter((each) => each.length < 95)
  //         .join(", ")
  //         .substring(0, 100) + ", "
  //     );
  //   } catch (err) {
  //     messageTransport.log(err.message || err);
  //   }
  // }

  // Selecting video language
  if (videoLang) {
    messageTransport.log("Selecting video language");

    const langHandler = await page.$x(
      "//*[normalize-space(text())='Video language']"
    );
    await page.evaluate((el) => el?.click(), langHandler[0]);
    // translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')
    const langName = await page.$x(
      '//*[normalize-space(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"))=\'' +
        videoLang.toLowerCase() +
        "']"
    );
    await page.evaluate((el) => el?.click(), langName[langName.length - 1]);
  }
  await sleep(2000);

  // click next button
  const nextBtnXPath = '//*[@id="next-button"]';
  await page.waitForXPath(nextBtnXPath);

  let next = await page.$x(nextBtnXPath);
  await next[0].click();

  await sleep(2000);
  await page.waitForXPath(nextBtnXPath);
  // click next button
  next = await page.$x(nextBtnXPath);
  await next[0].click();

  await sleep(2000);
  await page.waitForXPath(nextBtnXPath);
  // click next button
  next = await page.$x(nextBtnXPath);
  await next[0].click();
  //  const publicXPath = '//*[normalize-space(text())='Public']'
  //  await page.waitForXPath(publicXPath)
  //  const publicOption = await page.$x(publicXPath)
  //  await publicOption[0].click()

  // Get publish button
  const publishXPath =
    "//*[normalize-space(text())='Publish']/parent::*[not(@disabled)] | //*[normalize-space(text())='Save']/parent::*[not(@disabled)]";
  await page.waitForXPath(publishXPath);
  // save youtube upload link
  await page.waitForTimeout(3000);
  const videoBaseLink = "https://youtu.be";
  const shortVideoBaseLink = "https://youtube.com/shorts";
  const uploadLinkSelector = `[href^="${videoBaseLink}"], [href^="${shortVideoBaseLink}"]`;
  await page.waitForSelector(uploadLinkSelector);
  const uploadedLinkHandle = await page.$(uploadLinkSelector);

  let uploadedLink;
  do {
    await page.waitForTimeout(500);
    uploadedLink = await page.evaluate(
      (e) => e.getAttribute("href"),
      uploadedLinkHandle
    );
  } while (
    uploadedLink === videoBaseLink ||
    uploadedLink === shortVideoBaseLink
  );

  messageTransport.log("Publishing video...!!!");
  const closeDialogXPath = uploadAsDraft ? saveCloseBtnXPath : publishXPath;
  let closeDialog;
  for (let i = 0; i < 10; i++) {
    try {
      closeDialog = await page.$x(closeDialogXPath);
      await closeDialog[0].click();
      break;
    } catch (error) {
      messageTransport.log(error.message || error);
      console.log(error);
      await page.waitForTimeout(5000);
    }
  }
  // await page.waitForXPath('//*[contains(text(),"Finished processing")]', { timeout: 0})

  // no closeBtn will show up if keeps video as draft
  if (uploadAsDraft) return uploadedLink;

  // Wait for closebtn to show up
  try {
    await page.waitForXPath(closeBtnXPath);
  } catch (e) {
    await browsers[email].close();
    throw new Error(
      email,
      "Please make sure you set up your default video visibility correctly, you might have forgotten. More infos : https://github.com/fawazahmed0/youtube-uploader#youtube-setup"
    );
  }

  return uploadedLink;
}

async function loadAccount(credentials, messageTransport) {
  const email = credentials.email;
  const page = pages[email];
  try {
    if (!fs.existsSync(cookiesFilePath)) {
      await login(page, credentials, messageTransport);
    }
  } catch (error) {
    messageTransport.log(error.message || error);
    console.log(error);
    if (error.message === "Recapcha found") {
      if (browsers[email]) {
        await browsers[email].close();
      }
      throw error;
    }

    // Login failed trying again to login
    try {
      await login(page, credentials, messageTransport);
    } catch (error) {
      messageTransport.log(error.message || error);
      console.log(error);

      if (browsers[email]) {
        await browsers[email].close();
      }
      throw error;
    }
  }
  try {
    await changeHomePageLangIfNeeded(page);
  } catch (error) {
    messageTransport.log(error.message || error);
    console.log(error);
    await login(page, credentials, messageTransport);
  }
}

async function changeLoginPageLangIfNeeded(localPage) {
  const selectedLangSelector = '[aria-selected="true"]';
  try {
    await localPage.waitForSelector(selectedLangSelector);
  } catch (e) {
    throw new Error("Failed to find selected language : " + e.name);
  }

  const selectedLang = await localPage.evaluate(
    (selectedLangSelector) =>
      document.querySelector(selectedLangSelector).innerText,
    selectedLangSelector
  );

  if (!selectedLang) {
    throw new Error("Failed to find selected language : Empty text");
  }

  if (selectedLang.includes("English")) {
    return;
  }

  await localPage.click(selectedLangSelector);

  await localPage.waitForTimeout(1000);

  const englishLangItemSelector =
    '[role="presentation"]:not([aria-hidden="true"])>[data-value="en-GB"]';

  try {
    await localPage.waitForSelector(englishLangItemSelector);
  } catch (e) {
    throw new Error("Failed to find english language item : " + e.name);
  }

  await localPage.click(englishLangItemSelector);

  await localPage.waitForTimeout(1000);
}

async function changeHomePageLangIfNeeded(localPage) {
  await localPage.goto(homePageURL);

  const avatarButtonSelector = "button#avatar-btn";

  try {
    await localPage.waitForSelector(avatarButtonSelector);
  } catch (e) {
    throw new Error("Avatar/Profile picture button not found : " + e.name);
  }

  await localPage.click(avatarButtonSelector);

  const langMenuItemSelector =
    "#sections>yt-multi-page-menu-section-renderer:nth-child(3)>#items>ytd-compact-link-renderer>a";
  try {
    await localPage.waitForSelector(langMenuItemSelector);
  } catch (e) {
    throw new Error(
      'Language menu item selector/button(">") not found : ' + e.name
    );
  }

  const selectedLang = await localPage.evaluate(
    (langMenuItemSelector) =>
      document.querySelector(langMenuItemSelector).innerText,
    langMenuItemSelector
  );

  if (!selectedLang) {
    throw new Error("Failed to find selected language : Empty text");
  }

  if (selectedLang.includes("English")) {
    await localPage.goto(uploadURL);

    return;
  }

  await localPage.click(langMenuItemSelector);

  const englishItemXPath = "//*[normalize-space(text())='English (UK)']";

  try {
    await localPage.waitForXPath(englishItemXPath);
  } catch (e) {
    throw new Error("English(UK) item selector not found : " + e.name);
  }

  await localPage.waitForTimeout(3000);

  await localPage.evaluate((englishItemXPath) => {
    const element = document?.evaluate(
      englishItemXPath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    element.click();
  }, englishItemXPath);
  // Recursive language change, if YouTube, for some reason, did not change the language the first time, although the English (UK) button was pressed, the exit from the recursion occurs when the selectedLang selector is tested for the set language
  await changeHomePageLangIfNeeded(localPage);
}

async function launchBrowser(email, messageTransport) {
  try {
    messageTransport.log("Getting previos session...");
    const previousSession = fs.existsSync(cookiesFilePath);
    messageTransport.log("Launching browser...");

    messageTransport.log("Getting new page...");
    pages[email] = await createPage(browsers[email]);
    const page = pages[email];
    await page.setDefaultTimeout(timeout);
    if (previousSession) {
      // If file exist load the cookies
      const cookiesString = fs.readFileSync(cookiesFilePath, {
        encoding: "utf-8",
      });
      const parsedCookies = JSON.parse(cookiesString);
      if (parsedCookies.length !== 0) {
        for (const cookie of parsedCookies) {
          await page.setCookie(cookie);
        }
      }
    }
    await page.setBypassCSP(false);
  } catch (error) {}
}

async function login(localPage, credentials, messageTransport) {
  const email = credentials.email;
  messageTransport.log("Logging in");
  await localPage.goto("https://www.google.com/search?q=gmail");

  await localPage.waitForTimeout(2000);

  const xPath = '//*[@id="gb"]/div/div[1]/a';
  await localPage.waitForXPath(xPath);
  await localPage.click("xpath/" + xPath);
  const newP = await browsers[email].newPage();
  await newP.setBypassCSP(false);
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36";
  await newP.setUserAgent(ua);

  messageTransport.log("Goto: https://accounts.google.com");

  await newP.goto("https://accounts.google.com", {
    waitUntil: "networkidle2",
  });

  await changeLoginPageLangIfNeeded(newP);

  const emailInputSelector = 'input[type="email"]';
  await newP.waitForSelector(emailInputSelector);
  messageTransport.log("Entering email: " + email);

  await newP.type(emailInputSelector, email, { delay: 200 });
  await newP.keyboard.press("Enter");

  await newP.waitForNavigation();
  await newP.waitForTimeout(1000);

  const passwordInputSelector =
    'input[type="password"]:not([aria-hidden="true"])';
  await newP.waitForSelector(passwordInputSelector);
  messageTransport.log("Entering password: *******");
  await newP.type(passwordInputSelector, credentials.pass, { delay: 50 });
  await newP.keyboard.press("Enter");

  await newP.waitForNavigation();
  await newP.waitForTimeout(2000);

  // check if 2fa code was sent to phone
  const googleAppAuthSelector = "samp";
  let isOnGoogleAppAuthPage = await newP.evaluate(
    (authCodeSelector) => document.querySelector(authCodeSelector) !== null,
    googleAppAuthSelector
  );

  while (isOnGoogleAppAuthPage) {
    const codeElement = await newP.$("samp");
    const code = (await codeElement?.getProperty("textContent"))
      ?.toString()
      .replace("JSHandle:", "");
    if (code) {
      messageTransport.log(
        `****Press ""[ ${code} ]"" on your phone to login****`
      );
    }
    await newP.waitForNavigation({ timeout: 180000 });
    await newP.waitForTimeout(2000);

    isOnGoogleAppAuthPage = await newP.evaluate(
      (authCodeSelector) => document.querySelector(authCodeSelector) !== null,
      googleAppAuthSelector
    );
  }

  try {
    // check if sms code was sent
    const smsAuthSelector = "#idvPin";
    const isOnSmsAuthPage = await newP.evaluate(
      (smsAuthSelector) => document.querySelector(smsAuthSelector) !== null,
      smsAuthSelector
    );
    if (isOnSmsAuthPage) {
      try {
        if (!messageTransport.onSmsVerificationCodeSent) {
          throw new Error("onSmsVerificationCodeSent not implemented");
        }

        const code = await messageTransport.onSmsVerificationCodeSent();

        if (!code) throw new Error("Invalid SMS Code");

        await newP.type(smsAuthSelector, code.trim());
        await newP.keyboard.press("Enter");
      } catch (error) {
        messageTransport.log(error.message || error);
        console.log(error);
        await browsers[email].close();
        throw error;
      }
    }
  } catch (error) {
    messageTransport.log(error.message || error);
    console.log(error);
    const recaptchaInputSelector =
      'input[aria-label="Type the text you hear or see"]';

    const isOnRecaptchaPage = await localPage.evaluate(
      (recaptchaInputSelector) =>
        document.querySelector(recaptchaInputSelector) !== null,
      recaptchaInputSelector
    );

    if (isOnRecaptchaPage) {
      throw new Error("Recaptcha found");
    }

    throw new Error(error);
  }

  // create channel if not already created.
  // try {
  //   await localPage.click('#create-channel-button')
  //   await localPage.waitForTimeout(3000)
  // } catch (error) {
  //   messageTransport.log(error.message || error)
  //   messageTransport.log(
  //     'Channel already exists or there was an error creating the channel.'
  //   )
  // }
  try {
    await localPage.goto(uploadURL);

    const uploadPopupSelector = "ytcp-uploads-dialog";
    await localPage.waitForSelector(uploadPopupSelector, {
      timeout: 70000,
    });
  } catch (error) {
    messageTransport.log(error.message || error);
    console.log(error);
    if (credentials.recoveryemail) {
      await securityBypass(newP, credentials.recoveryemail, email);
    }
  }
  const cookiesObject = await localPage.cookies();
  await fs.mkdirSync(cookiesDirPath, { recursive: true });
  // Write cookies to temp file to be used in other profile pages
  await fs.writeFile(
    cookiesFilePath,
    JSON.stringify(cookiesObject),
    function (err) {
      if (err) {
        messageTransport.log("The file could not be written. " + err.message);
      }
      messageTransport.log("Session has been successfully saved");
    }
  );
  await newP.close();
}

// Login bypass with recovery email
async function securityBypass(localPage, recoveryemail, messageTransport) {
  try {
    const confirmRecoveryXPath =
      "//*[normalize-space(text())='Confirm your recovery email']";
    await localPage.waitForXPath(confirmRecoveryXPath);

    const confirmRecoveryBtn = await localPage.$x(confirmRecoveryXPath);
    await localPage.evaluate((el) => el?.click(), confirmRecoveryBtn[0]);
  } catch (error) {
    messageTransport.log(error.message || error);
    console.log(error);
  }

  await localPage.waitForNavigation({
    waitUntil: "networkidle0",
  });
  const enterRecoveryXPath =
    "//*[normalize-space(text())='Enter recovery email address']";
  await localPage.waitForXPath(enterRecoveryXPath);
  await localPage.waitForTimeout(5000);
  await localPage.focus('input[type="email"]');
  await localPage.waitForTimeout(3000);
  await localPage.type('input[type="email"]', recoveryemail, { delay: 100 });
  await localPage.keyboard.press("Enter");
  await localPage.waitForNavigation({
    waitUntil: "networkidle0",
  });
  const uploadPopupSelector = "ytcp-uploads-dialog";
  await localPage.waitForSelector(uploadPopupSelector, { timeout: 60000 });
}

async function sleep(ms) {
  return new Promise((sendMessage) => setTimeout(sendMessage, ms));
}

async function changeChannel(channelName, email) {
  const page = pages[email];

  await page.goto("https://www.youtube.com/channel_switcher");

  const channelNameXPath = `//*[normalize-space(text())='${channelName}']`;
  const element = await page.waitForXPath(channelNameXPath);

  await element.click();

  await page.waitForNavigation({
    waitUntil: "networkidle0",
  });
}

function escapeQuotesForXPath(str) {
  // If the value contains only single or double quotes, construct
  // an XPath literal
  if (!str.includes('"')) {
    return '"' + str + '"';
  }
  if (!str.includes("'")) {
    return "'" + str + "'";
  }
  // If the value contains both single and double quotes, construct an
  // expression that concatenates all non-double-quote substrings with
  // the quotes, e.g.:
  //
  //    concat("foo",'"',"bar")

  const parts = [];
  // First, put a '"' after each component in the string.
  for (const part of str.split('"')) {
    if (part.length > 0) {
      parts.push('"' + part + '"');
    }
    parts.push("'\"'");
  }
  // Then remove the extra '"' after the last component.
  parts.pop();
  // Finally, put it together into a concat() function call.

  return "concat(" + parts.join(",") + ")";
}

function xpathTextSelector(text, caseSensitive, nthElement) {
  let xpathSelector = "";
  if (caseSensitive) {
    xpathSelector = `//*[contains(normalize-space(text()),"${text}")]`;
  } else {
    const uniqueText = [...new Set(text.split(""))].join("");
    xpathSelector = `//*[contains(translate(normalize-space(text()),'${uniqueText.toUpperCase()}','${uniqueText.toLowerCase()}'),"${text
      .toLowerCase()
      .replace(/\s\s+/g, " ")}")]`;
  }
  if (nthElement) xpathSelector = `(${xpathSelector})[${nthElement + 1}]`;

  return xpathSelector;
}
