import axios from 'axios';
import { apiKey } from '../Constants/keys.js';
import { apiServiceUrl } from '../Utility/api-service.js';
import { updateVideos } from '../Utility/firebaseUtilFunctions.js';

const getApiKey = (FETCH_COUNT) => {
    return apiKey[FETCH_COUNT % 10];
};

export const fetchKeywordVideos = async (
    forEmail,
    keywords,
    forUser,
    messageTransport
) => {
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];

    let FETCH_COUNT = 0;
    let hasNext = true;
    let cursor = '0';

    try {
        messageTransport.log('api_count: ' + global.api_count);
        messageTransport.log('Fetching videos for #' + keyword);
        let options = {
            method: 'GET',
            url: 'https://tiktok-video-no-watermark2.p.rapidapi.com/feed/search',
            params: { keywords: keyword, count: '30', cursor },
            headers: getApiKey(global.api_count),
        };
        while (FETCH_COUNT < 30 && hasNext) {
            const response = await axios.request(options);

            hasNext = response.data.data.hasMore;
            cursor = response.data.data.cursor;
            options = {
                ...options,
                params: { ...options.params, cursor },
                headers: getApiKey(FETCH_COUNT),
            };

            const uploadResponse = await updateVideos(
                response.data.data.videos,
                forEmail,
                keyword,
                'TIKTOK',
                channelKeywords,
                forUser,
                FETCH_COUNT,
                messageTransport
            );

            messageTransport.log(uploadResponse.data.msg);
            FETCH_COUNT = uploadResponse.data.FETCH_COUNT;
            global.api_count += 1;
        }
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;

        messageTransport.log(error.message || error);
        console.log(error);
        throw error;
    }
};
