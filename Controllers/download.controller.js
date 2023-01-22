import fs from 'fs';
import download from 'download';

export const fileDownloadWithoutAudio = async (
    url,
    videoId,
    forEmail,
    messageTransport
) => {
    const videoWriteStream = fs.createWriteStream(
        `./Videos/${videoId}_${forEmail}.mp4`
    );
    return new Promise((resolve) => {
        messageTransport.log('Downloading video from fetched url...');
        download(url)
            .on('progress', (progress) => {
                messageTransport.log('progress: ' + progress);
            })
            .on('end', () => {
                messageTransport.log('Downloaded');
                resolve();
            })
            .pipe(videoWriteStream);
    });
};

export const removeFile = (dest) => {
    return new Promise((resolve) => {
        fs.unlink(dest, function (err) {
            if (err && err.code === 'ENOENT') {
                // file doens't exist
                console.info("File doesn't exist, won't remove it.");
            } else if (err) {
                // other errors, e.g. maybe we don't have enough permission
                console.error('Error occurred while trying to remove file');
            } else {
                console.info('removed');
                resolve();
            }
        });
    });
};
