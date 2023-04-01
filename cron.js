import axios from "axios";
import cron from "node-cron";

export const runCron = () => {
  console.log("Scheduling crons");
  cron.schedule("2 0 1,3,5,11,13,12,15,16,17,18,19,21,23 * * * *", async () => {
    console.log("Hitting /upload for:", "urbanlibaaz@gmail.com");

    var config = {
      method: "get",
      url: `http://localhost:8999/upload?email=urbanlibaaz@gmail.com&forUser=AMAN&targetUploadCount=1`,
    };

    const response = await axios(config);
    console.log(response.data);
  });

  cron.schedule(
    "2 12 1,3,5,11,13,12,15,16,17,18,19,21,23 * * * *",
    async () => {
      console.log("Hitting /upload for:", "amanpatidar110@gmail.com");

      var config = {
        method: "get",
        url: `http://localhost:8999/upload?email=amanpatidar110@gmail.com&forUser=AMAN&targetUploadCount=1`,
      };

      const response = await axios(config);
      console.log(response.data);
    }
  );

  cron.schedule(
    "2 24 1,3,5,11,13,12,15,16,17,18,19,21,23 * * * *",
    async () => {
      console.log("Hitting /upload for:", "aamanpatidar110@gmail.com");

      var config = {
        method: "get",
        url: `http://localhost:8999/upload?email=aamanpatidar110@gmail.com&forUser=AMAN&targetUploadCount=1`,
      };

      const response = await axios(config);
      console.log(response.data);
    }
  );

  cron.schedule(
    "2 36 1,3,5,11,13,12,15,16,17,18,19,21,23 * * * *",
    async () => {
      console.log("Hitting /upload for:", "Shubhamsa466@gmail.com");

      var config = {
        method: "get",
        url: `http://localhost:8999/upload?email=Shubhamsa466@gmail.com&forUser=AMAN&targetUploadCount=1`,
      };

      const response = await axios(config);
      console.log(response.data);
    }
  );

  cron.schedule(
    "8 48 1,3,5,11,13,12,15,16,17,18,19,21,23 * * * *",
    async () => {
      console.log("Hitting /upload for:", "akkupati0330@gmail.com");

      var config = {
        method: "get",
        url: `http://localhost:8999/upload?email=akkupati0330@gmail.com&forUser=AMAN&targetUploadCount=1`,
      };

      const response = await axios(config);
      console.log(response.data);
    }
  );

  cron.schedule("0 1 * * *", async () => {
    console.log(
      "Hitting /fetch_insta_messages for:",
      "amanpatidar110@gmail.com"
    );

    var config = {
      method: "POST",
      url: `http://localhost:8999/insta/fetch_messages_from_insta`,
      data: {
        forUser: "AMAN",
        instaCredId: "aamanpatidar110@gmail.com",
        forChannelEmail: "amanpatidar110@gmail.com",
      },
    };

    const response = await axios(config);
    console.log(response.data);
  });

  cron.schedule("0 18 * * *", async () => {
    console.log(
      "Hitting /fetch_insta_messages for:",
      "aamanpatidar110@gmail.com"
    );

    var config = {
      method: "POST",
      url: `http://localhost:8999/insta/fetch_messages_from_insta`,
      data: {
        forUser: "AMAN",
        instaCredId: "super_machines_0",
        forChannelEmail: "aamanpatidar110@gmail.com",
      },
    };

    const response = await axios(config);
    console.log(response.data);
  });
};
