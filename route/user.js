const router = require('express').Router();

module.exports = app => {

    /**
     * Get user
     */
    router.get('/', async (req, res) => {
        if (req.session.auth) {
            const currentUser = await app.services.user.get({ _id: req.session.user._id }, false, ['playlists']);
            if (!currentUser) {
                return res.result('Error getting current user, even though he is authorized');
            }
            currentUser.playlists = currentUser.playlists.map(async _id => await app.services.playlist.get({ _id }));
            currentUser.password = undefined;
            return res.result(null, currentUser);
        }
        return res.result(null, null);
    });

    /**
     * Sign in / Sign up
     */
    router.post('/', async (req, res) => {
        if (!req.body.username) {
            return res.result('Username missing');
        }
        if (!req.body.password) {
            return res.result('Password missing');
        }
        let currUser;
        const findUser = await app.services.user.get({ username: req.body.username }, false, ['playlists']);
        if (!findUser) {
            /**
             * Sign up
             */
            const newUser = await app.services.user.create(req.body.username, req.body.password);
            if (!newUser) {
                return res.result('Error create user')
            }
            newUser.password = undefined;
            currUser = newUser;
        } else {
            /**
             * Sign in
             */
            const passwordMatch = await app.services.user.verifyPassword(req.body.password, findUser.password);
            if (!passwordMatch) {
                return res.result('Wrong password')
            }
            findUser.playlists = findUser.playlists.map(async _id => await app.services.playlist.get({ _id }));
            findUser.password = undefined;
            currUser = findUser;
        }
        req.session.auth = true;
        req.session.user = currUser;
        return res.result(null, currUser);
    });

    /**
     * Logout
     */
    router.delete('/', (req, res) => {
        req.session.auth = false;
        req.session.user = null;
        return res.result(null);
    });

    /**
     * Playlists order
     */
    router.put('/', async (req, res) => {
        if (!req.body.playlists) {
            return res.result('Playlists missing');
        }
        const currentUser = await app.services.user.get({ username: req.body.username });
        if (!currentUser) {
            return res.result('Error getting current user');
        }
        currentUser.playlists = req.body.playlists;
        await currentUser.save();
        return res.result(null);
    });

    return router;
};


