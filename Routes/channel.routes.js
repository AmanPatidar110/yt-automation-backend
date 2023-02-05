import express from "express";
import { db, realTimeDB } from "../firebase.js";
import { getChannel } from "../Utility/firebaseUtilFunctions.js";

const router = express.Router();

router.post("/add_channel", async (req, res, next) => {
    try {
        const forUser = req.body.forUser;
        const channelEmail = req.body.email;
        const channelPassword = req.body.password;
        const keywords = req.body.keywords;
        const channelName = req.body.name;
        const defaultUploadCount = req.body.defaultUploadCount;

        console.log("body", channelEmail, channelPassword, keywords);
        const resp = await db.collection("channels").doc(channelEmail).set({
            forUser,
            name: channelName,
            email: channelEmail,
            password: channelPassword,
            defaultUploadCount,
            keywords,
        });

        const ref = realTimeDB.ref(forUser);
        ref.transaction(function (currentArray) {
            const emailEntry = channelEmail.replaceAll(".", "-");
            if (!currentArray) {
                currentArray = [];
            }
            if (currentArray.indexOf(emailEntry) === -1) {
                currentArray.push(emailEntry);
            }
            return currentArray;
        });

        console.log("channel added", resp);
        res.status(200).json({ msg: "ok", resp });
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
        return next(error);
    }
});

router.get("/get_channels", async (req, res, next) => {
    try {
        const forUser = req.query.forUser;

        const snapshot = await db
            .collection("channels")
            .where("forUser", "==", forUser)
            .get();
        const channels = [];
        snapshot.forEach((vid) => {
            channels.push(vid.data());
        });

        console.log("channels", channels);
        res.status(200).json({ msg: "ok", channels });
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
        return next(error);
    }
});

router.get("/get_channel", async (req, res, next) => {
    try {
        const email = req.query.email;

        const channelResponse = await getChannel(email);

        console.log("channels", channelResponse.data.msg);

        res.status(channelResponse.status).json(channelResponse.data);
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
        return next(error);
    }
});

router.delete("/delete_channel", async (req, res, next) => {
    try {
        const forUser = req.query.forUser;
        const email = req.query.email;

        const snapshot = await db
            .collection("channels")
            .where("forUser", "==", forUser)
            .where("email", "==", email)
            .get();

        const batch = db.batch();

        snapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        res.status(200).json({ msg: "ok" });
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        console.log(error);
        return next(error);
    }
});

export default router;
