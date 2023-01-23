import { db } from '../firebase.js';

export const getVideoCount = async (forUser, email) => {
    try {
        const videosRef = db.collection('videos');
        const query = videosRef
            .where('forEmail', '==', email)
            .where('forUser', '==', forUser)
            .where('uploaded', '==', false);

        const availableCount = (await query.count().get()).data().count;
        return availableCount;
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
    }
};
export const getVideos = async (forUser, email, limit) => {
    try {
        const videosRef = db.collection('videos');
        const query = videosRef
            .where('forEmail', '==', email)
            .where('forUser', '==', forUser)
            .where('uploaded', '==', false);

        const snapshot2 = await query.limit(parseInt(limit)).get();
        if (snapshot2.empty) {
            console.log('No matching videos.');
            return { data: { msg: 'No matching videos.' }, status: 200 };
        }

        const videos = [];
        snapshot2.forEach((vid) => {
            videos.push(vid.data());
        });
        return { data: { msg: 'Videos fetched.', videos }, status: 200 };
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
    }
};
export const updateVideo = async (video, videoId) => {
    try {
        await db
            .collection('videos')
            .doc(videoId)
            .update({
                ...video,
            });
        return { data: { msg: 'Video updated.' }, status: 200 };
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
    }
};
export const updateVideos = async (
    videos,
    forEmail,
    keyword,
    source,
    channelKeywords,
    forUser,
    FETCH_COUNT,
    messageTransport = console
) => {
    try {
        videos.forEach(async (video) => {
            const vidRef = db.collection('videos').doc(video.video_id);
            const vid = await vidRef.get();
            if (!vid.exists) {
                await db
                    .collection('videos')
                    .doc(video.video_id)
                    .set({
                        ...video,
                        forEmail,
                        forUser,
                        keyword,
                        title: video.title.substr(0, 75),
                        description: `Video credit goes to: @${video.author.unique_id} (${source}) 
            For removal request please refer this email: ${forEmail} 
            ${video.title}
            `,
                        tags: [
                            ...video.title.split('#'),
                            ...channelKeywords,
                            'short',
                            'shorts',
                            'shorts_video',
                            'shortsfeed',
                            'trending',
                        ]
                            .join(', #')
                            .substr(0, 450),
                        uploaded: false,
                        source,
                    });

                FETCH_COUNT += 1;
            } else {
                messageTransport.log('Document already exists!');
            }
        });
        return { data: { msg: 'Videos uploaded.', FETCH_COUNT }, status: 200 };
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        messageTransport.log(error.message || error);
    }
};
export const getInstaAccount = async (
    instaCredId,
    messageTransport = console
) => {
    try {
        const instaRef = db.collection('instaAccounts').doc(instaCredId);
        const instaAccount = (await instaRef.get()).data();
        return {
            data: { msg: 'Fetched insta account.', instaAccount },
            status: 200,
        };
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        messageTransport.log(error.message || error);
    }
};
export const getInstaAccounts = async (forUser, messageTransport = console) => {
    try {
        const snapshot = await db
            .collection('instaAccounts')
            .where('forUser', '==', forUser)
            .get();
        const instaAccounts = [];
        snapshot.forEach((vid) => {
            instaAccounts.push(vid.data());
        });
        return {
            data: { msg: 'Fetched insta accounts.', instaAccounts },
            status: 200,
        };
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        messageTransport.log(error.message || error);
    }
};
export const getChannel = async (email, messageTransport = console) => {
    try {
        const channelRef = db.collection('channels').doc(email);
        const channel = (await channelRef.get()).data();
        return {
            data: { msg: 'Fetched channel.', channel },
            status: 200,
        };
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        messageTransport.log(error.message || error);
    }
};
