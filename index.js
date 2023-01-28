const sqlite3 = require('sqlite3').verbose();
const config = require('config');
const dbPath = config.get('dbPath');

let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
    init();
});

function init() {
    console.log('main called');
    db.get('select * from credentials', (err, row) => {
        if (err) {
            console.log(new Date(), err);
        }
    });
}
