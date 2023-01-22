import { realTimeDB } from '../firebase.js';

export class MessageTransport {
    email = '';
    foruser = 'USER';

    constructor({ email, forUser }) {
        this.email = email;
        this.foruser = forUser;
    }

    log = async (...args) => {
        const ref = realTimeDB.ref(this.foruser || 'USER');
        args.forEach(async (message) => {
            console.log(`[${this.email || 'User@gmail.com'}]: `, message);

            ref.push({
                timeStamp: Date.now(),
                email: this.email,
                message: message || 'Did not receive any message',
            });
        });
    };
}
