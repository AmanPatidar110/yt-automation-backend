export const messageTransport = (email, message) => {
    console.log(`[${email || 'User'}]: `, message);
};
