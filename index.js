const sqlite3 = require('sqlite3').verbose();
const config = require('config');
const dbPath = config.get('dbPath');
const client_id = config.get('clientId');
const client_secret = config.get('clientSecret');
const request = require('request');
const queryString = require('querystring');
const _ = require('lodash');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(Date.now(), err.message);
    }
    console.log('Connected to the database.');

    startPlaylistCreation();
});

function startPlaylistCreation() {
    getToken().then((tokens) => {
        getMe(tokens).then(
            (meResults) => {
                console.log('successful getMe'); 
                return Promise.resolve(meResults);
            },
            (failedTokens) => {
                console.log('failed getMe');
                return new Promise((resolve, reject) => {
                    refreshToken(failedTokens).then((tokens) => {
                        getMe(tokens).then((meResults) => resolve(meResults));
                    });
                });
            }
        ).then((meResults) => createListOfShowIds(meResults));
    });
}

function createListOfShowIds(shows) {
    console.log('createListOfShowIds');
    if (shows && shows.items && !_.isEmpty(shows.items)) {
        const showIds = [];
        _.forEach(shows.items, (item) => {
            console.log(item.show.id);
        });
    }
}

function getToken() {
    console.log('getToken');
    return new Promise((resolve, reject) => {
        db.get('select * from tokens', (err, row) => {
            if (err) {
                console.log(Date.now(), 'error in getToken() : ', err);
            } else {
                resolve(row);
            }
        })
    });
}

function getMe(tokens) {
    return new Promise((resolve, reject) => {
        console.log('getMe');
        const options = {
            url: 'https://api.spotify.com/v1/me/shows',
            headers: {
                'Authorization': 'Bearer ' + tokens.access,
                'Content-Type': 'application/json'
            },
            json: true
        };

        request.get(options, (error, response, body) => {

            if (body.error && body.error.status === 401) {
                reject(tokens);
            } else {
                resolve(body);
            }
        });
    });
}

function refreshToken(tokens) {
    console.log('refreshToken');
    return new Promise((resolve, reject) => {
        const authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
            form: {
                grant_type: 'refresh_token',
                refresh_token: tokens.refresh
            },
            json: true
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                db.run('update tokens set access = ?', body.access_token);
                tokens.access = body.access_token;
                resolve(tokens);
            } else {
                console.log(Date.now(), error);
            }
        });
    });
}
