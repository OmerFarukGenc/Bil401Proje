const scrapeStatusElement = document.getElementById("scrapeStatus");
const numberOfDaycaresElement = document.getElementById("numberOfDaycares");
const searchParams = new URLSearchParams(window.location.search);

const page = searchParams.has("page") ? searchParams.get("page") : 1;
const limit = searchParams.has("limit") ? searchParams.get("limit") : 50;



const zeroPad = (num, numZeros) => {
    var n = Math.abs(num);
    var zeros = Math.max(0, numZeros - Math.floor(n).toString().length);
    var zeroString = Math.pow(10, zeros).toString().substr(1);
    if (num < 0) {
        zeroString = '-' + zeroString;
    }

    return zeroString + n;
}


const updateQueryParam = (param, value) => {
    var urlObject = new URL(window.location);
    urlObject.searchParams.set(param, value);
    window.location.href = urlObject.toString();
}

const statsElement = document.getElementById("stats");


let scrapeStatus = false;


const limitDropdown = document.getElementById("limitDropdown");
limitDropdown.value = limit;
limitDropdown.addEventListener("change", (e) => {
    updateQueryParam("limit", e.target.value);
})

const statFunction = () => {
    fetch("/scrapeStatus").then(res => {
        res.json().then(json => {
            scrapeStatus = json;
            if (json) {
                scrapeStatusElement.innerHTML = `Scraping Status: <span style="color: green">ON</span>`;
            } else {
                scrapeStatusElement.innerHTML = `Scraping Status: <span style="color: red">OFF</span>`;
            }
        })
    })

    fetch("/getNumberOfDaycares").then(res => {

        res.json().then(json => {
            //console.log(json);
            numberOfDaycaresElement.innerText = `Current number of daycares: ${json.count}`;
            statsElement.innerText = `Number Of Hits: ${json.stat[0].value} 
                Number Of Misses: ${json.stat[1].value}
                Hit Ratio: ${json.stat[1].value != 0 ? json.stat[0].value / (json.stat[0].value + json.stat[1].value) * 100 : 0}%
            `
        })
    })
}


statFunction();
setInterval(statFunction, 1000);


const toggleButton = document.getElementById("scrapeButton");

toggleButton.addEventListener("click", (e) => {

    if (scrapeStatus)
        fetch("/scrapeOff");
    else
        fetch("/scrapeOn");


})


const tableBodyElement = document.getElementById("tableBody");
const pagesTopElement = document.getElementById("pagesTop");
const pagesBottomElement = document.getElementById("pagesBottom");
const refreshButton = document.getElementById("refreshButton");
const idMapElement = document.getElementById("idMap");
const stateDropdownElement = document.getElementById("stateDropdown");
const cityDropdownElement = document.getElementById("cityDropdown");






const map = L.map('map').setView([37.7749, -122.4194], 4); // Default center is set to San Francisco

// Add the base map (you can choose a different tile layer)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);



const fetchAndDisplayInfo = async () => {
    fetch(`/api?page=${page}&limit=${limit}`).then(res => {

        res.json().then(json => {

            let citiesCords = null;


            const ttt = () => {

                stateDropdownElement.innerHTML = "";
                for (let i = 0; i < json.states.length; i++) {
                    stateDropdownElement.innerHTML += `<option value="${json.states[i].State}">${json.states[i].State}</option>`
                }
    
                cityDropdownElement.innerHTML = "";
                for (let i = 0; i < json.cities.length; i++) {
                    let c = json.cities[i].City;
                    let s = json.cities[i].State;
                    //console.log(`${json.cities[i].State + "," + json.cities[i].City}`);
                    cityDropdownElement.innerHTML += `<option value="${json.cities[i].State + "," + json.cities[i].City}">${json.cities[i].State + "," + json.cities[i].City}</option>`;
                    citiesCords.forEach(element => {
                        if (s == element.state_id && c == element.city) {
                            L.marker([element.lat, element.lng]).addTo(map)
                                .bindPopup(c);
                        }
                    });
    
                }
    
    
                tableBodyElement.innerHTML = "";
    
                const numberOfPages = json.numberOfPages;
    
                pagesTopElement.innerHTML = "";
                pagesTopElement.innerHTML += `<a href="/?page=${page > 1 ? page - 1 : 1}&limit=${limit}"><</a>`;
    
                for (let i = 0; i < numberOfPages; i++) {
                    pagesTopElement.innerHTML += `
                    <a ${i == page - 1 ? 'style="color:red"' : ''} href="/?page=${i + 1}&limit=${limit}"> ${i + 1}</a>
                    `;
                }
    
                pagesTopElement.innerHTML += `<a href="/?page=${page < parseInt(numberOfPages) ? parseInt(page) + 1 : numberOfPages}&limit=${limit}">></a>`;
    
                pagesBottomElement.innerHTML = pagesTopElement.innerHTML;
    
                const data = json.data;
                for (let i = 0; i < data.length; i++) {
                    let daycare = data[i];
                    tableBodyElement.innerHTML += `
                    <tr>
                    <td>
                    <a href="https://www.daycare.com/php/showlisting.php?ID=${zeroPad(daycare.id, 8)}"> ${daycare.id}</a>
                        
                    </td>
                    <td>
                        ${daycare.Name}
                    </td>
                    <td>
                        ${daycare.Street_Address}
                    </td>
                    <td>
                        ${daycare.City}
                    </td>
                    <td>
                        ${daycare.State}
                    </td>
                    <td>
                        ${daycare.Zip_Code}
                    </td>
                    <td>
                        ${daycare.Phone}
                    </td>
                </tr>
                    `
    
                }
            }

            // Initialize the map
            fetch("/cities.json").then(res => {
                res.json().then(json => {
                    citiesCords = json;
                    console.log("####");



                    ttt();

                })
            })
            //console.log(json);


        })
    })

}

refreshButton.addEventListener("click", (e) => {
    fetchAndDisplayInfo();
})

fetchAndDisplayInfo();


