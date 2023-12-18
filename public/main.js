const scrapeStatusElement = document.getElementById("scrapeStatus");
const numberOfDaycaresElement = document.getElementById("numberOfDaycares");
const searchParams = new URLSearchParams(window.location.search);

const page = searchParams.has("page") ? searchParams.get("page"): 1;
const limit = searchParams.has("limit") ? searchParams.get("limit"): 50;



const statsElement = document.getElementById("stats");


let scrapeStatus = false;



const statFunction = () => {
    fetch("/scrapeStatus").then(res => {
        res.json().then(json => {
            scrapeStatus = json;
            if(json){
                scrapeStatusElement.innerHTML = `Scraping Status: <span style="color: green">ON</span>`;
            }else {
                scrapeStatusElement.innerHTML = `Scraping Status: <span style="color: red">OFF</span>`;
            }
        })
    })

    fetch("/getNumberOfDaycares").then(res => {

        res.json().then(json => {
            console.log(json);
            numberOfDaycaresElement.innerText = `Current number of daycares: ${json.count}`;
            statsElement.innerText = `Number Of Hits: ${json.stat[0].value}, 
                Number Of Misses: ${json.stat[1].value},
                Hit Ratio: ${json.stat[1].value != 0 ? json.stat[0].value / (json.stat[0].value + json.stat[1].value) : 0}%
            `
        })
    })
}


statFunction();
setInterval(statFunction,1000);


const toggleButton = document.getElementById("scrapeButton");

toggleButton.addEventListener("click",(e) => {

    if(scrapeStatus) 
        fetch("/scrapeOff");
    else 
        fetch("/scrapeOn");
    

})


const tableBodyElement = document.getElementById("tableBody");
const pagesTopElement = document.getElementById("pagesTop");
const pagesBottomElement = document.getElementById("pagesBottom");
const refreshButton = document.getElementById("refreshButton");

const fetchAndDisplayInfo = async () => {
    fetch(`/api?page=${page}&limit=${limit}`).then(res => {

        res.json().then(json => {
            console.log(json);
            tableBodyElement.innerHTML = "";
    
            const numberOfPages = json.numberOfPages;
    
            pagesTopElement.innerHTML = "";
            pagesTopElement.innerHTML += `<a href="/?page=${page > 1?page - 1:1}&limit=${limit}"><</a>`;
    
            for(let i = 0;i < numberOfPages;i++){
                pagesTopElement.innerHTML += `
                <a ${i == page - 1 ?'style="color:red"':''} href="/?page=${i + 1}&limit=${limit}"> ${i + 1}</a>
                `;
            }
    
            pagesTopElement.innerHTML += `<a href="/?page=${page < parseInt(numberOfPages)?parseInt(page) + 1:numberOfPages}&limit=${limit}">></a>`;
    
            pagesBottomElement.innerHTML = pagesTopElement.innerHTML;
    
            const data = json.data;
            for(let i = 0;i < data.length;i++){
                let daycare = data[i];
                tableBodyElement.innerHTML +=`
                <tr>
                <td>
                    ${daycare.id}
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
    
        })
    })

}

refreshButton.addEventListener("click",(e) => {
    fetchAndDisplayInfo();
})

fetchAndDisplayInfo();


