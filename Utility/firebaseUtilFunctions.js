import { db } from "../firebase.js";

export const getVideoCount = async (forUser, email, keyword) => {
  try {
    const videosRef = db.collection("videos");
    const query = videosRef
      .where("forEmail", "==", email)
      .where("forUser", "==", forUser)
      .where("uploaded", "==", false)
      .where("keyword", "==", keyword);

    const availableCount = (await query.count().get()).data().count;
    return availableCount;
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    console.log(error);
  }
};
export const getVideos = async (forUser, email, limit, keyword) => {
  console.log("KEYWORD...............", keyword);
  try {
    const videosRef = db.collection("videos");
    const query = videosRef
      .where("forEmail", "==", email)
      .where("forUser", "==", forUser)
      .where("uploaded", "==", false)
      .where("keyword", "==", keyword);

    const snapshot2 = await query.limit(parseInt(limit)).get();
    if (snapshot2.empty) {
      console.log("No matching videos.");
      return { data: { msg: "No matching videos." }, status: 200 };
    }

    const videos = [];
    snapshot2.forEach((vid) => {
      videos.push(vid.data());
    });
    return { data: { msg: "Videos fetched.", videos }, status: 200 };
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    console.log(error);
    throw error;
  }
};
export const addChannel = async (channel) => {
  try {
    const resp = await db
      .collection("channels")
      .doc(channel?.email)
      .set(channel);
    return { data: resp, status: 200 };
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    console.log(error);
    throw error;
  }
};
export const updateVideo = async (video, videoId) => {
  try {
    await db
      .collection("videos")
      .doc(videoId)
      .update({
        ...video,
      });
    return { data: { msg: "Video updated." }, status: 200 };
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    console.log(error);
  }
};
export const increaseChannelKeywordCount = async (KEYWORD_COUNT, forEmail) => {
  try {
    await db
      .collection("channels")
      .doc(forEmail)
      .update({
        KEYWORD_COUNT: KEYWORD_COUNT + 1,
      });
    return { data: { msg: "Channel keyword count updated." }, status: 200 };
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
  let newFetchCount = FETCH_COUNT;
  try {
    videos.forEach(async (video) => {
      const vidRef = db.collection("videos").doc(video.video_id);
      const vid = await vidRef.get();
      if (!vid.exists) {
        messageTransport.log(`Adding document...${newFetchCount}`);

        await db
          .collection("videos")
          .doc(video.video_id)
          .set({
            ...video,
            forEmail,
            forUser,
            keyword,
            title: video.title.substr(0, 75),
            description: `
Video credit goes to: @${video.author.unique_id} (${source}) 
For removal request please refer this email: ${forEmail}
`,
            tags: [...video.title.split("#")],
            uploaded: false,
            source,
          });

        newFetchCount += 1;
      } else {
        messageTransport.log("Document already exists!");
      }
    });
    return {
      data: { msg: "Videos uploaded.", FETCH_COUNT: newFetchCount },
      status: 200,
    };
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
    const instaRef = db.collection("instaAccounts").doc(instaCredId);
    const instaAccount = (await instaRef.get()).data();
    return {
      data: { msg: "Fetched insta account.", instaAccount },
      status: 200,
    };
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    messageTransport.log(error.message || error);
    throw error;
  }
};
export const getInstaAccounts = async (forUser, messageTransport = console) => {
  try {
    const snapshot = await db
      .collection("instaAccounts")
      .where("forUser", "==", forUser)
      .get();
    const instaAccounts = [];
    snapshot.forEach((vid) => {
      instaAccounts.push(vid.data());
    });
    return {
      data: { msg: "Fetched insta accounts.", instaAccounts },
      status: 200,
    };
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    messageTransport.log(error.message || error);
  }
};
export const getChannel = async (email, messageTransport = console) => {
  try {
    const channelRef = db.collection("channels").doc(email);
    const channel = (await channelRef.get()).data();
    return {
      data: { msg: "Fetched channel.", channel },
      status: 200,
    };
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    messageTransport.log(error.message || error);
    throw error;
  }
};
