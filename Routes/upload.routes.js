const express = require('express');
const router = express.Router();

const { YoutubeUploader } = require('@luthfipun/yt-uploader');
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
        let UPLOAD_COUNT = 0;
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
            .get();
        if (snapshot2.empty) {
            console.log('No matching videos.');
            res.status(200).json({ msg: 'No matching videos.', UPLOAD_COUNT });
        }

        const videos = [];
        snapshot2.forEach((vid) => {
            videos.push(vid.data());
        });

        const youtubeUploader = new YoutubeUploader(
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            UPLOAD_PRIVACY_PRIVATE
        );

        for (const video of videos) {
            console.log(video.video_id, '=>', UPLOAD_COUNT, targetUploadCount);
            if (UPLOAD_COUNT >= targetUploadCount) {
                break;
            }
            await youtubeUploader.Login(email, channel.password);
            console.log('LoggedIn to your account and muting audio');
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
            console.log('muting done. Now, Uploading ...');
            await youtubeUploader.UploadVideo(
                `Videos/${video.video_id}.mp4`,
                video.title,
                video.description,
                '',
                video.tags
            );
            UPLOAD_COUNT += 1;
            await db.collection('videos').doc(video.video_id).update({
                uploaded: true,
            });

            await removeFile(`Videos/${video.video_id}.mp4`);

            console.log('Uploading successfully');
        }

        await youtubeUploader.CloseBrowser();
        res.status(200).json({ msg: 'Videos uploaded', UPLOAD_COUNT });
    } catch (e) {
        console.log(e);
    }
});

const onVideoUploadSuccess = async (videoId) => {
    await db.collection('videos').doc(video_id).update({
        uploaded: true,
    });

    await removeFile(`Videos/${video_id}.mp4`);
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
            res.status(200).json({ msg: 'No matching videos.', UPLOAD_COUNT });
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
