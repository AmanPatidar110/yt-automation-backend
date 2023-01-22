import express from 'express';
import axios from 'axios';
import { crawl } from '../instabot.js';

import { apiServiceUrl } from '../Utility/api-service.js';
import { MessageTransport } from '../Utility/messageTransport.js';

const router = express.Router();

router.post('/fetch_messages_from_insta', async (req, res, next) => {
    const forUser = req.body.forUser; // 'AMAN | "ABHISHEK'
    const instaCredId = req.body.instaCredId; // 'swipe_facts'
    const forChannelEmail = req.body.forChannelEmail; // 'amanpatidar110@gmail.com'
    const messageTransport = new MessageTransport({
        email: forChannelEmail,
        forUser,
    });
    try {
        const response = await axios.request({
            method: 'GET',
            url: `${apiServiceUrl}/insta/get_insta_account?instaCredId=${instaCredId}`,
        });
        const instaAccount = response.data.instaAccount;
        const FETCH_COUNT = await crawl(
            instaAccount.threadIds,
            instaCredId,
            instaAccount.credPassword,
            forChannelEmail,
            forUser,
            messageTransport
        );
        res.status(200).json({ msg: 'ok', FETCH_COUNT });
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        messageTransport.log(error);
        return next(error);
    }
});

export default router;
