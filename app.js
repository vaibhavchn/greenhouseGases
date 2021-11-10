
import {years, countries, categories} from './data.js';
import admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import Redis from 'redis';
import serviceAccount from './ifrenny-firebase-adminsdk-xkwe6-b6f19331b0.js'; // Obtaining config credentials for firebase
import dotenv from 'dotenv';
dotenv.config();

console.log(process.env.REDIS_URL)


const bluesky = express();
bluesky.use(cors({origin: true}));


// Initializing firebase instance 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ifrenny-default-rtdb.firebaseio.com"
});


// Initializing Redis client

const redisClient = Redis.createClient(process.env.REDIS_URL, {tls: {
        rejectUnauthorized: false
    }});

redisClient.on('error', err => {
    console.log('Error ' + err);
});


// REDIS Cache will expire after this time
const DEFAULT_EXPIRATION = 3600

const PORT = process.env.PORT || 5000;




// Managing cache through redis ----------------------- setting and obtaining data from redis store

const cacheManage = (key, callBack) => {
    return new Promise((resolve, reject) => {
        redisClient.get(key, async (error, data) => {
            if (error) return reject(error)
            if (data != null) return resolve(data)
            const newData = await callBack() // fired if data is not available in redis and gets the data inside this callback function
            redisClient.setex(key, DEFAULT_EXPIRATION, JSON.stringify(newData)) // Setting a key value pair with expiration time
            resolve(newData)
        })
    })
}



// First API ----------------->

bluesky.get("/countries", async (req, res) => {
    try {
      const countryData = await cacheManage('countries', async () => {
        const response = await admin.firestore().collection("Pollution").get(); // Get data from firestore
        if (response) {
        const data = response.docs;
        let finalData = [];

        // Looping through countries
    
        Object.keys(data).forEach((item) => {
            const countryName = data[item].id;
            let queryCountry = {name: countryName};  // Creating an object for each country

            //Looping through each gas (categories)
    
            Object.keys(data[item].data()).forEach((innerItem) => {


              queryCountry[innerItem] = {}; // Creating an object for each gas in a country
      
              const yearList = Object.keys(data[item].data()[innerItem]);
              let startYear = null;
              let endYear = null;


              // Checking which year has the valid first and last entry to assign them to startYear and endYear
              for (let yearName of yearList) {
                  if (data[item].data()[innerItem][yearName] === "NaN" && yearName !== yearList[yearList.length - 1]) {
                    continue;
                  }

                  // When no year have a valid data for a particular gas
                  if (data[item].data()[innerItem][yearName] === "NaN" && yearName === yearList[yearList.length - 1] && (startYear && endYear) === null) {
                    queryCountry[innerItem].message = "Data unavailable";
                    break;
                  }
                  if (data[item].data()[innerItem][yearName] !== "NaN") {
                    queryCountry[innerItem].message = "Data available";
                    if (startYear === null) {
                        startYear = yearName;
                    }
                    endYear = yearName;
                  }
              }
      

              // Now checking if there is any gas that dosen't have any entry for any of the year
              // and assigning startYear = 1990 and endYear = 2014 with values "NaN"
      
              if (queryCountry[innerItem].message !== "Data unavailable") {
                  queryCountry[innerItem][startYear] = data[item].data()[innerItem][startYear];
                  queryCountry[innerItem][endYear] = data[item].data()[innerItem][endYear];
              } else {
                  queryCountry[innerItem][yearList[0]] = "NaN";
                  queryCountry[innerItem][yearList[yearList.length - 1]] = "NaN";
              }
            });
            finalData.push(queryCountry);
        });

        return finalData;

        } else {
          return 500;
        }
      })
    

      if(countryData !== 500) {
          if(typeof countryData === "string") {
              return res.status(200).json(JSON.parse(countryData));
            } else {
              return res.status(200).json(countryData);
          }
        } else {
          return res.status(500).json({message: "Internal Server Error"});
      }
      
  } catch (error) {
    console.error("message: ", error);
    return res.status(500).json({message: "Internal Server Error"});
  }
});


// Second API --------------->

bluesky.get("/country/:id/query", async (req, res) => {
  let queryCountry = req.params.id;
  const {endYear: queryEndYear, startYear: queryStartYear, name: gasname} = req.query;

  // Handeling casing problem for country name
  var countryName = queryCountry.split(" ").map(queryCountry => queryCountry.charAt(0).toUpperCase() + queryCountry.slice(1).toLowerCase())
  queryCountry = countryName.join(" ") === "United States Of America" ? "United States of America" : countryName.join(" ");
  
  if (!gasname) {
    return res.status(400).json({message: "Incomplete query"});
  }

  // Handeling casing problem for gas names
  let queryCategories = gasname.split(" ").map(item => item.toUpperCase()).filter((item) => item !== "AND");

  let errorMessage = "Success";
  let message = "Success";
  let finalStartYear = queryStartYear;
  let finalEndYear = queryEndYear;


  // Country not found
  if (!countries.includes(queryCountry)) {
    errorMessage = `Data unavailable for country ${queryCountry}`;
    return res.status(404).json({message: errorMessage});
  }

  // Category combination not found (even if any one of them is not in the dataset)
  const filteredArray = categories.filter((value) => queryCategories.includes(value));
  if (JSON.stringify(filteredArray) !== JSON.stringify(queryCategories)) {
    errorMessage = `Data unavailable for the set of categories provided -> ${queryCategories}`;
    return res.status(404).json({message: errorMessage});
  }

  //  If startYear is greater than endYear --> Invert the values
  if (Number(queryStartYear) > Number(queryEndYear)) {
    finalStartYear = queryEndYear;
    finalEndYear = queryStartYear;
  }

  // Year values out of bound
  if (!years.includes(finalStartYear)) {
    message = "Data available only from 1990 to 2014";
    finalStartYear = years[0];
  }
  if (!years.includes(finalEndYear)) {
    message = "Data available only from 1990 to 2014";
    finalEndYear = years[years.length - 1];
  }


  // Making a list from startYear to endYear and striping the rest
  const validRequiredYearList = years.slice(
      years.indexOf(finalStartYear),
      years.indexOf(finalEndYear) + 1
    );


  // Making key for storing data in REDIS
  queryCategories.sort()
  var keyList = [queryCountry];
  keyList = keyList.concat(queryCategories);
  keyList.push(finalStartYear, finalEndYear);
  const key = keyList.join("_");

  
  try {
      const countrySpecificData = await cacheManage(key, async () => {
          const response = await admin.firestore().collection("Pollution").doc(queryCountry).get();
      
          if (response) {
            const responseData = response.data();

            // Making response object
            let finalData = {
              countryName: queryCountry,
              metaData: {
                requestedFromYear: queryStartYear,  //  startYear that user requested
                requestedToYear: queryEndYear,      //  endYear that user requested
                providingFromYear: finalStartYear,  //  startYear for which data will be provided
                providingToYear: finalEndYear,      //  endYear for which data will be provided
                requestedFor: queryCategories,      //  list of gases for which data is requested
                providingDataStatus: "Complete",    //  [Complete] or [Partial (if any value is NaN)] or [Data unavailable for( 1 or all the gases)]
              },
              message: message,                     // [Success] or [Data available only from 1990 to 2014 (for out of boud request)]
            };
      
            let partialData = 0;
            let missingDataIndividual = 0;
      
            queryCategories.forEach((innerItem) => {
              partialData = 0;
              finalData[innerItem] = {}; // Declaring object for individual category
      
              validRequiredYearList.forEach((year) => {
                finalData[innerItem][year] = responseData[innerItem][year];

                // Logic to give appropriate {providingDataStatus} in response
                if (responseData[innerItem][year] === "NaN") {
                  finalData["metaData"]["providingDataStatus"] = "Partial";
                  partialData ++;
                }
              });

              // Logic to give appropriate {providingDataStatus} in response
              if (partialData === validRequiredYearList.length) {
                missingDataIndividual ++;
                finalData["metaData"]["providingDataStatus"] = `Data unavailable for ${innerItem}`;
              }
            });
      
            // Logic to give appropriate {providingDataStatus} in response
            if (missingDataIndividual === queryCategories.length) {
              finalData["metaData"]["providingDataStatus"] = "No Data found for requested categories";
            }
      
            return finalData;
          } else {
            return 500;
          }
      })


      if(countrySpecificData !== 500) {
          if(typeof countrySpecificData === "string") {
              return res.status(200).json(JSON.parse(countrySpecificData));
            } else {
              return res.status(200).json(countrySpecificData);
          }
        } else {
          return res.status(500).json({message: "Internal Server Error"});
      }

  } catch (error) {
    console.error("message: ", error);
    return res.status(500).json({message: "Internal Server Error"});
  }
});


// An endpoint for everything else
bluesky.all("*", (req, res) => {
  res.status(404).json({message: "Resource not found"});
});


bluesky.listen(PORT, console.log(`Server is listening on port ${PORT}`))
