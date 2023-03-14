import axios from "axios";
import { apiKeys } from "../Constants/keys.js";
import { db } from "../firebase.js";
import {
  increaseChannelKeywordCount,
  updateVideos,
} from "../Utility/firebaseUtilFunctions.js";

const getApiKey = (API_COUNT) => {
  const apiKey = apiKeys[API_COUNT % 12];
  console.log("API KEY...", apiKey);
  return apiKey;
};

export const fetchKeywordVideos = async (
  forEmail,
  keywords,
  forUser,
  messageTransport,
  KEYWORD_COUNT = Math.floor(Math.random() * keywords.length)
) => {
  const keyword = keywords[KEYWORD_COUNT % (keywords.length || 1)];
  let reattempts = 0;
  let FETCH_COUNT = 0;
  let hasNext = true;
  let cursor = "0";

  try {
    messageTransport.log("api_count: " + global.api_count);
    messageTransport.log("Fetching videos for #" + keyword);
    let options = {
      method: "GET",
      url: "https://tiktok-video-no-watermark2.p.rapidapi.com/feed/search",
      params: { keywords: keyword, count: "30", cursor },
      headers: getApiKey(global.api_count),
    };
    while (FETCH_COUNT < 2 && hasNext) {
      let response;
      try {
        response = await axios.request(options);
        console.log("tit tok api response", response?.data?.data);
        if (!response)
          throw new Error(response?.data?.msg || "No response from the API!");
      } catch (error) {
        messageTransport.log(error);
        global.api_count += 1;
        reattempts += 1;
        if (reattempts > apiKeys.length) {
          throw new Error(response?.data?.msg || "All APIs exausted!");
        } else {
          continue;
        }
      }

      hasNext = response.data?.data?.hasMore;
      cursor = response.data?.data?.cursor;
      options = {
        ...options,
        params: { ...options.params, cursor },
        headers: getApiKey(FETCH_COUNT),
      };

      const uploadResponse = await updateVideos(
        response.data.data.videos,
        forEmail,
        keyword,
        "TIKTOK",
        keywords,
        forUser,
        FETCH_COUNT,
        messageTransport
      );

      messageTransport.log(uploadResponse.data.msg);
      FETCH_COUNT = uploadResponse.data.FETCH_COUNT;
      console.log("FETCH COUNT..........", FETCH_COUNT);
      global.api_count += 1;
    }
    messageTransport.log(
      "Updating channel keyword count, current count: " + KEYWORD_COUNT
    );

    increaseChannelKeywordCount(KEYWORD_COUNT, forEmail);
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    global.api_count += 1;
    messageTransport.log(error.message || error);
    console.log(error);
    throw error;
  }
};
