const main = async () => {

    const express = require('express');
    const fs = require('fs');
    const path = require('path');
    const sqlite3 = require('sqlite3').verbose();
    const open = require("sqlite").open;

    const db = await open({
        filename: "data.db",
        driver: sqlite3.Database
    })


    const app = express();
    const port = 3000; // You can choose any available port
    app.use(express.static(path.join(__dirname, 'public')));

    const sqliteFilePath = path.join(__dirname, 'data.db');

    let scrapeProcess = null;


    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS daycare (
        id STRING PRIMARY KEY,
        Name TEXT,
        Street_Address TEXT,
        City TEXT,
        State TEXT,
        Zip_Code TEXT,
        Phone TEXT
    );
    `;

    const result = await db.run(createTableQuery);


    const createVariableQuery = `
    CREATE TABLE IF NOT EXISTS variable (
        variableName TEXT PRIMARY KEY,
        value NUMBER
    );
    `
    await db.run(createVariableQuery);



    const hitVariableCreationQuery = `INSERT OR IGNORE INTO variable (variableName,value) VALUES ("hit",0);`
    const missVariableCreationQuery = `INSERT OR IGNORE INTO variable (variableName,value) VALUES ("miss",0);`

    await db.run(hitVariableCreationQuery);
    await db.run(missVariableCreationQuery);


    const createIdTableQuery = `
    CREATE TABLE IF NOT EXISTS daycareIDs (
        id STRING PRIMARY KEY
    );
    `
    await db.run(createIdTableQuery);


    let key = false;

    // Define a route
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, "./index.html"));
        return;
    });



    app.get('/scrapeOn', (req, res) => {
        if (!key) {
            const { spawn } = require("child_process");
            scrapeProcess = spawn('node', ['scrapeIDs.js']);

            scrapeProcess.stdout.on('data', (data) => {
                console.log(`Child process output: ${data}`);
            });

            scrapeProcess.stderr.on('data', (data) => {
                console.error(`Child process error: ${data}`);
            });

            scrapeProcess.on('close', (code) => {
                key=false;
                console.log(`Child process exited with code ${code}`);
            });

            res.send('Child process started.');
            key = true;
        }

    })

    app.get('/scrapeStatus', (req, res) => {
        res.send(key);
    })

    app.get('/getNumberOfDaycares', async (req, res) => {
        const countQuery = `SELECT COUNT(*) as count FROM daycare;`;

        const result = await db.get(countQuery);

        const statQuery = `SELECT *  FROM variable;`;

        const stat = await db.all(statQuery);
        const IDListQuery = `SELECT id FROM daycare;`;
        const IDList = await db.all(IDListQuery);

        const IDmap = Array(1000).fill(0);
        //console.log(IDList);
        
        for(let i = 0;i < IDList.length;i++)
            IDmap[Math.floor(IDList[i].id / 100000000 )] = 1;
        
    
        //console.log(stat);
        res.send({ ...result, stat,IDmap });
    })


    app.get('/scrapeOff', (req, res) => {

        if (key) {
            scrapeProcess.kill('SIGINT');
            scrapeProcess = null;
        }
        key = false;
        res.send('Child process stopped.');
    })

    app.get("/api", async (req, res) => {
        const page = req.query.page;
        const limit = req.query.limit;

        const result = await db.all(`SELECT * FROM daycare LIMIT ${limit} OFFSET ${(page - 1) * limit}`);
        //console.log(result);


        const distinctStatesQuery = `
        SELECT DISTINCT State FROM daycare;
        `;

        const states = await db.all(distinctStatesQuery);

        const distinctCitiesQuery = `
        SELECT DISTINCT State,City FROM daycare;
        `;

        const cities = (await db.all(distinctCitiesQuery)).sort();

        const distinctsZipCodeQuery = `
        SELECT DISTINCT Zip_Code FROM daycare;
        `;

        const zipCodes = await db.all(distinctsZipCodeQuery);

        const numberOfPages = Math.floor(((await db.get(`SELECT COUNT(*) as count FROM daycare;`)).count / limit)) + 1;

        res.send({data:result,numberOfPages,states,cities,zipCodes});
        return;
    })


    // Start the server
    app.listen(port, () => {
        console.log(`Server is listening at http://localhost:${port}`);
    });




}

main();