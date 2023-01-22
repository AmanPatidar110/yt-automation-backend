import { realTimeDB } from '../firebase.js';

export class MessageTransport {
    email = '';
    foruser = 'USER';

    constructor({ email, forUser }) {
        this.email = email;
        this.foruser = forUser;
    }

    log = async (...args) => {
        args.forEach(async (message) => {
            console.log(`[${this.email || 'User'}]: `, message);
            const ref = realTimeDB.ref(this.foruser || 'USER');
            await ref
                .child(Date.now())
                .set(`[${this.email || 'User'}]: ${message}`);
        });
    };
}
