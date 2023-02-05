const sqlite3 = require('sqlite3').verbose();
const config = require('config');
const dbPath = config.get('dbPath');
const client_id = config.get('clientId');
const client_secret = config.get('clientSecret');
const request = require('request');
const queryString = require('querystring');

let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(new Date(), err.message);
    }
    console.log('Connected to the database.');
    getToken().then((tokens) => {
        getMe(tokens).then((sup) => console.log(sup));
    });
});

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

const getMe = (tokens) => {
    const outerPromise = new Promise((resolve, reject) => {
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
                refreshToken(tokens.refresh).then((newTokens) => {
                    // todo recursive call to getMe? Resolve outer promise if successful 
                    // recursion spooky

                    // getMe(newTokens).then((recurBody) => {
                    //     console.log('getMe failed');
                    //     resolve(recurBody);
                    // });
                });
            } else {
                console.log('getMe success');
                resolve(body)
            }
            console.log(body);
        });
    });

    return outerPromise;
}

const refreshToken = (refresh_token) => {
    console.log('refreshToken');
    return new Promise((resolve, reject) => {
        const authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
            form: {
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            },
            json: true
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                db.run('update tokens set access = ?', body.access_token);
                resolve({ access: body.access_token, refresh: refresh_token });
            } else {
                console.log(error);
            }
        });
    });
}
