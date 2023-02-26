import express from "express";
import axios from "axios";
import { crawl } from "../instabot.js";

import { MessageTransport } from "../Utility/messageTransport.js";
import {
  getInstaAccount,
  getInstaAccounts,
} from "../Utility/firebaseUtilFunctions.js";
import { db } from "../firebase.js";

const router = express.Router();

router.post("/fetch_messages_from_insta", async (req, res, next) => {
  const forUser = req.body.forUser; // 'AMAN | "ABHISHEK'
  const instaCredId = req.body.instaCredId; // 'swipe_facts'
  const forChannelEmail = req.body.forChannelEmail; // 'amanpatidar110@gmail.com'
  const messageTransport = new MessageTransport({
    email: forChannelEmail,
    forUser,
  });
  try {
    messageTransport.log("Fetching insta account: " + instaCredId);
    const instaResponse = await getInstaAccount(instaCredId, messageTransport);
    const instaAccount = instaResponse?.data?.instaAccount;
    const FETCH_COUNT = await crawl(
      instaAccount.threadIds,
      instaCredId,
      instaAccount.credPassword,
      forChannelEmail,
      forUser,
      messageTransport
    );
    res.status(200).json({ msg: "ok", FETCH_COUNT });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    messageTransport.log(error.message || error);
    console.log(error);
    return next(error);
  }
});

router.post("/add_insta_account", async (req, res, next) => {
  try {
    const forUser = req.body.forUser;
    const credId = req.body.credId;
    const credPassword = req.body.credPassword;
    const threadIds = req.body.threadIds;
    const accountName = req.body.accountName;
    const defaultForEmail = req.body.defaultForEmail;

    const resp = await db.collection("instaAccounts").doc(credId).set({
      forUser,
      credId,
      credPassword,
      threadIds,
      accountName,
      defaultForEmail,
    });

    console.log("insta account added", resp);
    res.status(200).json({ msg: "ok", resp });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    console.log(error);
    return next(error);
  }
});

router.get("/get_insta_account", async (req, res, next) => {
  try {
    const instaCredId = req.query.instaCredId;
    const instaResponse = await getInstaAccount(instaCredId);

    console.log("insta account:", instaResponse.data.instaAccount);
    res.status(instaResponse.status).json(instaResponse.data);
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    console.log(error);
    return next(error);
  }
});

router.get("/get_insta_accounts", async (req, res, next) => {
  try {
    const forUser = req.query.forUser;
    const instaResponse = await getInstaAccounts(forUser);

    console.log("instaAccounts", instaResponse.data.instaAccounts);
    res.status(instaResponse.status).json(instaResponse.data);
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    console.log(error);
    return next(error);
  }
});

router.delete("/delete_insta_account", async (req, res, next) => {
  try {
    const forUser = req.query.forUser;
    const credId = req.query.credId;

    const snapshot = await db
      .collection("instaAccounts")
      .where("forUser", "==", forUser)
      .where("credId", "==", credId)
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
