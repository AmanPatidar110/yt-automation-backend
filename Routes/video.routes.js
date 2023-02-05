import express from 'express';
import { db } from '../firebase.js';
import { getVideos, updateVideo } from '../Utility/firebaseUtilFunctions.js';

const router = express.Router();

router.get('/get_videos', async (req, res, next) => {
    try {
        const forUser = req.query.forUser;
        const email = req.query.email;
        const limit = req.query.limit;

        const resp = await getVideos(forUser, email, limit);
        res.status(resp.status).json(res.data);
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
        return next(error);
    }
});

router.patch('/update_video', async (req, res, next) => {
    try {
        const video = req.body.video;
        const videoId = req.body.videoId;

        const resp = await updateVideo(video, videoId);

        res.status(resp.status).json(resp.data);
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
        return next(error);
    }
});

export default router;
