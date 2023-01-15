const express = require('express');
const router = express.Router();

const YoutubeUploader = require('../Utility/youtubeUploaderLibrary/index');
const {
    UPLOAD_PRIVACY_PRIVATE,
} = require('@luthfipun/yt-uploader/dist/helpers/youtubeUploaderOptions');
const { db } = require('../firebase');
const {
    fileDownloadWithoutAudio,
    removeFile,
} = require('../Controllers/download.controller');

const { getVideoUrlForInsta } = require('../Controllers/getVideoUrlForInsta');
const {
    getVideoFromTiktokVideoId,
} = require('../Controllers/getVideoFromTiktokVideoId');
const { fetchKeywordVideos } = require('../Controllers/fetchKeywordVideos');

router.get('/', async (req, res, next) => {
    try {
        const email = req.query.email;
        const targetUploadCount = req.query.targetUploadCount;

        const channelRef = db.collection('channels').doc(email);
        const channel = await (await channelRef.get()).data();

        const videosRef = db.collection('videos');
        let availableCount = 0;
        do {
            const snapshot = await videosRef
                .where('forEmail', '==', email)
                .where('uploaded', '==', false)
                .count()
                .get();

            availableCount = snapshot.data().count;
            console.log('snapshot', availableCount);
            if (availableCount < targetUploadCount) {
                await fetchKeywordVideos(email, channel.keywords);
            }
        } while (availableCount < targetUploadCount);

        const snapshot2 = await videosRef
            .where('forEmail', '==', email)
            .where('uploaded', '==', false)
            .limit(parseInt(targetUploadCount))
            .get();
        if (snapshot2.empty) {
            console.log('No matching videos.');
            res.status(200).json({ msg: 'No matching videos.' });
        }

        const videos = [];
        const videoMetaData = [];
        snapshot2.forEach((vid) => {
            videos.push(vid.data());
        });

        const youtubeUploader = new YoutubeUploader(
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'PRIVATE'
        );

        for (const video of videos) {
            console.log(video.video_id, '=>', targetUploadCount);

            let videoURL = '';
            if (video.source === 'INSTAGRAM') {
                videoURL = await getVideoUrlForInsta(video.video_id);
            } else {
                videoURL = await getVideoFromTiktokVideoId(
                    video.video_id,
                    video.unique_id
                );
            }

            console.log('videoURL', videoURL);
            if (!videoURL) {
                await onVideoUploadSuccess(video.video_id);
                continue;
            }
            await fileDownloadWithoutAudio(videoURL, video.video_id);
            videoMetaData.push({
                Video: `Videos/${video.video_id}.mp4`,
                Title: video.title,
                Description: video.description,
                Thumbnail: '',
                Tags: video.tags,
                onSuccess: async () =>
                    await onVideoUploadSuccess(video.video_id),
            });
        }
        console.log('muting done. Now, Uploading ...');
        // upload starts here

        await youtubeUploader.Login(email, channel.password);
        console.log('LoggedIn to your account and muting audio');
        await youtubeUploader.UploadVideo(videoMetaData);

        console.log('Uploading successfully');
        // // end here
        let UPLOAD_COUNT = await youtubeUploader.CloseBrowser();
        res.status(200).json({ msg: 'Videos uploaded', UPLOAD_COUNT });
    } catch (e) {
        console.log(e);
    }
});

const onVideoUploadSuccess = async (videoId) => {
    await db.collection('videos').doc(videoId).update({
        uploaded: true,
    });

    await removeFile(`Videos/${videoId}.mp4`);
};

router.get('/new', async (req, res) => {
    try {
        const credentials = {
            email: req.query.email,
            pass: req.query.password,
            recoveryEmail: req.query.recoveryEmail,
        };
        const targetUploadCount = parseInt(req.query.targetUploadCount);

        const videosRef = db.collection('videos');
        const snapshot = await videosRef
            .where('forEmail', '==', credentials.email)
            .where('uploaded', '==', false)
            .limit(targetUploadCount)
            .get();
        if (snapshot.empty) {
            console.log('No matching videos.');
            res.status(200).json({ msg: 'No matching videos.' });
        }

        const videos = [];
        const videoMetaData = [];
        snapshot.forEach((vid) => {
            const oneVideo = vid.data();
            videos.push({
                path: `Videos/${oneVideo.video_id}.mp4`,

                title: oneVideo.title,
                description: oneVideo.description,
                language: 'english',
                tags: createTagForYoutube(oneVideo.tags),
                onSuccess: () => onVideoUploadSuccess(oneVideo.video_id),
                skipProcessingWait: true,
                uploadAsDraft: true, //as of now the uploaded video will be in draft mode
                isAgeRestriction: false,
                isNotForKid: true,
            });
            videoMetaData.push({
                video_id: oneVideo.video_id,
                source: oneVideo.source,
                unique_id: oneVideo.unique_id,
            });
        });

        for (const video of videoMetaData) {
            let videoURL = '';
            if (video.source === 'INSTAGRAM') {
                videoURL = await getVideoUrlForInsta(video.video_id);
            } else {
                videoURL = await getVideoFromTiktokVideoId(
                    video.video_id,
                    video.unique_id
                );
            }

            await fileDownloadWithoutAudio(videoURL, video.video_id);
        }
        await upload(credentials, videos, {
            executablePath:
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        });
        res.status(200).json({ msg: 'Videos uploaded', UPLOAD_COUNT });
    } catch (error) {
        console.log(error);
    }
});

module.exports = router;
