import admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';

// Fetch the service account key JSON file contents
import { serviceAccountConstants } from './service-account.js';

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
    credential: admin.credential.cert(serviceAccountConstants),
    // The database URL depends on the location of the database
    databaseURL:
        'https://shorts-d8f86-default-rtdb.asia-southeast1.firebasedatabase.app/',
});

// As an admin, the app has access to read and write all data, regardless of Security Rules

const realTimeDB = getDatabase();
// var ref = reaTimeDB.ref('restricted_access/secret_document');

export { realTimeDB };
