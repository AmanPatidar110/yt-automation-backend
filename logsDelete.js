import admin from "firebase-admin";
import { getDatabase } from "firebase-admin/database";

// Fetch the service account key JSON file contents
import { serviceAccountConstants } from "./service-account.js";

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
    credential: admin.credential.cert(serviceAccountConstants),
    // The database URL depends on the location of the database
    databaseURL:
        "https://shorts-d8f86-default-rtdb.asia-southeast1.firebasedatabase.app/",
});

const realTimeDB = getDatabase();

const tRef = realTimeDB.ref("AMAN");

const batchSize = 100; // number of items to delete in one batch
const updates = {};

let deleted = 0;

// Function to delete a batch of items
const deleteBatch = () => {
    tRef.limitToFirst(50000)
        .once("value")
        .then(async function (snapshot) {
            var updates = {};
            snapshot.forEach(function (child) {
                console.log(child.key);
                updates[child.key] = null;
            });
            await tRef.update(updates);
            console.log("FINISHED");
        });
};

// Start deleting data
deleteBatch();
