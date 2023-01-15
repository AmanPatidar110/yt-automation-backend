const { default: axios } = require('axios');
const apiKey = require('../Constants/keys');
const { db } = require('../firebase');

const getApiKey = (apiUseCount) => {
    return apiKey[apiUseCount % 10];
};

exports.fetchKeywordVideos = async (forEmail, keywords) => {
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    try {
        let FETCH_COUNT = 0;
        let apiUseCount = 0;
        let hasNext = true;
        let cursor = '0';

        let options = {
            method: 'GET',
            url: 'https://tiktok-video-no-watermark2.p.rapidapi.com/feed/search',
            params: { keywords: keyword, count: '30', cursor },
            headers: getApiKey(apiUseCount),
        };

        while (FETCH_COUNT < 30 && hasNext) {
            const response = await axios.request(options);

            hasNext = response.data.data.hasMore;
            cursor = response.data.data.cursor;
            options = {
                ...options,
                params: { ...options.params, cursor },
                headers: getApiKey(apiUseCount),
            };
            response.data.data.videos.forEach(async (video) => {
                const vidRef = db.collection('videos').doc(video.video_id);
                const vid = await vidRef.get();
                if (!vid.exists) {
                    await db
                        .collection('videos')
                        .doc(video.video_id)
                        .set({
                            ...video,
                            keyword,
                            forEmail,
                            title: video.title.substr(0, 75),
                            description: video.title,
                            tags: [...video.title.split('#'), ...keywords]
                                .join(', #')
                                .substr(0, 500),
                            uploaded: false,
                        });

                    FETCH_COUNT += 1;
                    apiUseCount += 1;
                } else {
                    console.log('Document already exists!');
                }
            });
        }
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
        throw error;
    }
};
