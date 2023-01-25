import express from 'express';
import http from 'http';
import cors from 'cors';

import uploadRoutes from './Routes/upload.routes.js';
import instaRoutes from './Routes/insta.routes.js';
import channelRoutes from './Routes/channel.routes.js';
import { runCron } from './cron.js';

const app = express();
app.use(cors());
app.use(express.json());

global.api_count = 0;

const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

runCron();
server.listen(PORT, () => {
    console.log('listening on port *: ', PORT);
});
app.use(express.json());

app.use('/insta', instaRoutes);
app.use('/upload', uploadRoutes);
app.use('/channel', channelRoutes);

app.use((error, req, res, next) => {
    if (!error.statusCode) error.statusCode = 500;
    if (!error.message) error.message = 'Server side error';
    const status = error.statusCode;
    const message = error.message;
    const data = error.data;

    res.status(status).json({ message: message, data: data });
});
