const f = async () => {


    console.log("TEST");
    const sqlite3 = require('sqlite3').verbose();
    const open = require("sqlite").open;
    const cheerio = require("cheerio");

    const db = await open({
        filename: "data.db",
        driver: sqlite3.Database
    })


    process.on("SIGTERM", async () => {
        await db.close();
        process.exit(0);
    });

    const createNotFoundQueueQuery = `
  CREATE TABLE IF NOT EXISTS notFoundQueue (
    up TEXT,
    down TEXT,
    timestamp_column DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (up,down)
  );
`;

    const createFoundStackQuery = `
    CREATE TABLE IF NOT EXISTS foundStack (
        up TEXT,
        down TEXT,
      timestamp_column DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (up,down)
    );
  `;


    await db.run(createNotFoundQueueQuery);
    await db.run(createFoundStackQuery);

   
    const zeroPad = (num, numZeros) => {
        var n = Math.abs(num);
        var zeros = Math.max(0, numZeros - Math.floor(n).toString().length);
        var zeroString = Math.pow(10, zeros).toString().substr(1);
        if (num < 0) {
            zeroString = '-' + zeroString;
        }

        return zeroString + n;
    }


    let fetchByIdIsValid = async (ID) => {

        ID = zeroPad(ID, 8);
        let html;
        let htmlText;


        let result = null;
        try {
            //console.log("BEFORE ERROR1");
            html = await fetch(`https://www.daycare.com/php/showlisting.php?ID=${zeroPad(ID, 8)}`);
            //console.log("BEFORE ERROR2");
            htmlText = await html.text();
            result = !(htmlText).includes(`<h3 color="green">~facility_name~</h3>`);
            //console.log("BEFORE ERROR3");

        } catch (err) {

            process.exit();
        }

        //console.log("BEFORE ERROR4");

        if (!result)
            return result;

        //console.log("BEFORE ERROR5");
        //console.log(htmlText);
        const $ = cheerio.load(htmlText);

        //[daycare.id,daycare.name,daycare.streetAddress,daycare.city,daycare.state,daycare.stateZip,daycare.phone]
        const daycare = {};
        daycare.id = zeroPad(ID, 8);
        daycare.name = await $("h3[color=\"green\"]").text();
        daycare.streetAddress = await $("table:nth-child(2) > tbody > tr:nth-child(2) > td:nth-child(2)").text();
        daycare.city = await $("table:nth-child(2) > tbody > tr:nth-child(3) > td:nth-child(2)").text();
        daycare.state = await $("table:nth-child(2) > tbody > tr:nth-child(4) > td:nth-child(2)").text();
        daycare.stateZip = await $("table:nth-child(2) > tbody > tr:nth-child(5) > td:nth-child(2)").text();
        daycare.phone = await $("table:nth-child(2) > tbody > tr:nth-child(6) > td:nth-child(2) > strong").text();
        console.log(daycare);
        return daycare;
    };

    const pushToFoundStack = async (down = "", up = "") => {
        const pushQuery = `
  INSERT  INTO foundStack (up,down, timestamp_column) VALUES (?,?, CURRENT_TIMESTAMP);
`;
        await db.run(pushQuery, [up, down]);
    }


    const popFromFoundStack = async () => {
        const fetchNewestQuery = `
  SELECT * FROM foundStack ORDER BY timestamp_column DESC LIMIT 1;
`;

        const result = await db.get(fetchNewestQuery);
        const deleteQuery = `
        DELETE FROM foundStack
        WHERE up = ? AND down = ?;
        `;

        //console.log("pop",result);
        await db.run(deleteQuery, [result.up, result.down]);
        return result;

    }

    const enqueueToNotFoundQueue = async (down = "", up = "") => {
        const enqueueQuery = `
  INSERT INTO notFoundQueue (up,down, timestamp_column) VALUES (?,?, CURRENT_TIMESTAMP);
`;

        await db.run(enqueueQuery, [up, down]);
    }

    const dequeueFromTheNotFoundQueue = async () => {
        const fetchOldestQuery = `
  SELECT * FROM notFoundQueue ORDER BY timestamp_column ASC LIMIT 1;
`;

        const result = await db.get(fetchOldestQuery);
        const deleteQuery = `
        DELETE FROM notFoundQueue
        WHERE up = ? AND down = ?;
        `;
        //console.log("enqueue",result);
        await db.run(deleteQuery, [result.up, result.down]);
        return result;
    }


    const insertDaycare = async (daycare = {}) => {
        const insertQuery = `
  INSERT INTO daycare (id, Name,Street_Address,City,State,Zip_Code, Phone )
  VALUES (?,?,?,?,?,?,?);
`;

        const updateQuery = `
        UPDATE variable
        SET value = value + 1
        WHERE variableName = "hit";
        `;

        await db.run(updateQuery);

        await db.run(insertQuery, [daycare.id.trim(), daycare.name.trim(), daycare.streetAddress.trim(), daycare.city.trim(), daycare.state.trim(), daycare.stateZip.trim(), daycare.phone.trim()]);

        /*
                const insertQuery = `INSERT OR IGNORE INTO daycareIDs (id) VALUES (?)`;
                await db.run(insertQuery, [daycare.id]);
        
                */
    }

    const numberOfElementsInFoundStack = async () => {
        const countQuery = `SELECT COUNT(*) AS rowCount FROM foundStack;`;
        const result = await db.get(countQuery);
        return result.rowCount;
    }

    const numberOfElementsInNotFoundQueue = async () => {
        const countQuery = `SELECT COUNT(*) AS rowCount FROM notFoundQueue;`;
        const result = await db.get(countQuery);
        return result.rowCount;
    }


    let down = 0;
    let up = 99999999;


    let mid = Math.round((up + down) / 2);
    let fetchResult = await fetchByIdIsValid(mid);

    console.log(await numberOfElementsInFoundStack());
    console.log(await numberOfElementsInNotFoundQueue());


    if ((await numberOfElementsInFoundStack()) == 0 && (await numberOfElementsInNotFoundQueue()) == 0) {
        console.log("XXX");
        enqueueToNotFoundQueue("" + 0, "" + 99999999);
        console.log(await numberOfElementsInFoundStack());
        console.log(await numberOfElementsInNotFoundQueue());
    }



    while ((await numberOfElementsInFoundStack()) != 0 || (await numberOfElementsInNotFoundQueue()) != 0) {

        if ((await numberOfElementsInFoundStack()) != 0)
            temp = await popFromFoundStack();
        else if ((await numberOfElementsInNotFoundQueue) != 0)
            temp = await dequeueFromTheNotFoundQueue();



        //console.log(temp);
        up = Number.parseInt(temp.up);
        down = Number.parseInt(temp.down);
        mid = Math.floor((up + down) / 2);

        console.log("Current: " + mid);

        fetchResult = await fetchByIdIsValid(mid);

        if (fetchResult) {
            //  console.log("FOUND " + zeroPad(mid, 8));

            await insertDaycare(fetchResult);

            if (down != mid && mid + 1 != up) {
                await pushToFoundStack(down, mid);
                await pushToFoundStack(mid + 1, up);
            }

        } else {
            console.log("Invalid " + zeroPad(mid, 8));

            const updateQuery = `
            UPDATE variable
            SET value = value + 1
            WHERE variableName = "miss";
            `;

            await db.run(updateQuery);

            if (down != mid && mid + 1 != up) {
                await enqueueToNotFoundQueue(down, mid);
                await enqueueToNotFoundQueue(mid + 1, up);
            }

        }






    }

    //fs.writeFileSync("output.json",JSON.stringify(result));

}

f();