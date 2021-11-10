
import {years, countries, categories} from './data.js';
import admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import Redis from 'redis';
import dotenv from 'dotenv';
import serviceAccount from './ifrenny-firebase-adminsdk-xkwe6-b6f19331b0.json';
dotenv.config();


// Initializing and declaring variable 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ifrenny-default-rtdb.firebaseio.com"
});

const bluesky = express();
bluesky.use(cors({origin: true}));

const redisClient = Redis.createClient('redis://:p704c91a7501171bc01a1ba83cb98e3b1d624bbce5d93cf9d0f75f2273d370cfa@ec2-3-216-231-188.compute-1.amazonaws.com:9850', {tls: {
        rejectUnauthorized: false
    }});

redisClient.on('error', err => {
    console.log('Error ' + err);
});

const DEFAULT_EXPIRATION = 3600;

const PORT = process.env.PORT || 5000;






// Managing cache through redis -----------------------

const cacheManage = (key, callBack) => {
    return new Promise((resolve, reject) => {
        redisClient.get(key, async (error, data) => {
            if (error) return reject(error)
            if (data != null) return resolve(data)
            const newData = await callBack()
            redisClient.setex(key, DEFAULT_EXPIRATION, JSON.stringify(newData))
            resolve(newData)
        })
    })
}


bluesky.get("/countries", async (req, res) => {
    try {
      const countryData = cacheManage('countries', async () => {
        const response = await admin.firestore().collection("Pollution").get();
        if (response) {
        const data = response.docs;
        let finalData = [];
    
        Object.keys(data).forEach((item) => {
            const countryName = data[item].id;
            let queryCountry = {name: countryName};
    
            Object.keys(data[item].data()).forEach((innerItem) => {
            queryCountry[innerItem] = {};
    
            const yearList = Object.keys(data[item].data()[innerItem]);
            let startYear = null;
            let endYear = null;
    
            for (let yearName of yearList) {
                if (data[item].data()[innerItem][yearName] === "NaN" && yearName !== yearList[yearList.length - 1]) {
                continue;
                }
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
        redisClient.setex("countries", DEFAULT_EXPIRATION, JSON.stringify(finalData));
        return finalData;
        } else {
        console.log("Something went wrong");
        // return res.status(500).json({message: "Internal Server Error"});
        return 500;
        }
      })

      if(countryData === 500) {
          return res.status(500).json({message: "Internal Server Error"});
      } else {
          return res.status(200).json(countryData);
      }




    //   redisClient.get('countries', async (error, countries) => {
    //       if (error) console.log(error)
    //       if (countries != null) {
    //           return res.status(200).json(JSON.parse(countries));
    //       } else {
    //           const response = await admin.firestore().collection("Pollution").get();
          
    //           if (response) {
    //             const data = response.docs;
    //             let finalData = [];
          
    //             Object.keys(data).forEach((item) => {
    //               const countryName = data[item].id;
    //               let queryCountry = {name: countryName};
          
    //               Object.keys(data[item].data()).forEach((innerItem) => {
    //                 queryCountry[innerItem] = {};
          
    //                 const yearList = Object.keys(data[item].data()[innerItem]);
    //                 let startYear = null;
    //                 let endYear = null;
          
    //                 for (let yearName of yearList) {
    //                   if (data[item].data()[innerItem][yearName] === "NaN" && yearName !== yearList[yearList.length - 1]) {
    //                     continue;
    //                   }
    //                   if (data[item].data()[innerItem][yearName] === "NaN" && yearName === yearList[yearList.length - 1] && (startYear && endYear) === null) {
    //                     queryCountry[innerItem].message = "Data unavailable";
    //                     break;
    //                   }
    //                   if (data[item].data()[innerItem][yearName] !== "NaN") {
    //                     queryCountry[innerItem].message = "Data available";
    //                     if (startYear === null) {
    //                       startYear = yearName;
    //                     }
    //                     endYear = yearName;
    //                   }
    //                 }
          
          
    //                 if (queryCountry[innerItem].message !== "Data unavailable") {
    //                   queryCountry[innerItem][startYear] = data[item].data()[innerItem][startYear];
    //                   queryCountry[innerItem][endYear] = data[item].data()[innerItem][endYear];
    //                 } else {
    //                   queryCountry[innerItem][yearList[0]] = "NaN";
    //                   queryCountry[innerItem][yearList[yearList.length - 1]] = "NaN";
    //                 }
    //               });
    //               finalData.push(queryCountry);
    //             });
    //             redisClient.setex("countries", DEFAULT_EXPIRATION, JSON.stringify(finalData));
    //             return res.status(200).json(finalData);
    //           } else {
    //             console.log("Something went wrong");
    //             return res.status(500).json({message: "Internal Server Error"});
    //           }
    //       }
    //   })
      
  } catch (error) {
    console.error("message: ", error);
    return res.status(500).json({message: "Internal Server Error"});
  }
});





bluesky.get("/country/:id/query", async (req, res) => {
  const queryCountry = req.params.id;
  const {endYear: queryEndYear, startYear: queryStartYear, name: gasname} = req.query;
  if (!gasname) {
    return res.status(400).json({message: "Incomplete query"});
  }
  const queryCategories = gasname.split(" ").filter((item) => item !== "and");

  let errorMessage = "Success";
  let message = "Success";

  // UseCases

  let finalStartYear = queryStartYear;
  let finalEndYear = queryEndYear;


  // Country not found
  if (!countries.includes(queryCountry)) {
    errorMessage = `Data unavailable for country ${queryCountry}`;
    return res.status(404).json({message: errorMessage});
    // returns here with error ===================================================
  }

  // Categories not found
  const filteredArray = categories.filter((value) => queryCategories.includes(value));
  if (JSON.stringify(filteredArray) !== JSON.stringify(queryCategories)) {
    errorMessage = `Data unavailable for the set of categories provided -> ${queryCategories}`;
    return res.status(404).json({message: errorMessage});
    // returns here with error ===================================================
  }

  //  inverted values
  if (Number(queryStartYear) > Number(queryEndYear)) {
    finalStartYear = queryEndYear;
    finalEndYear = queryStartYear;
  }

  // Values out of bound
  if (!years.includes(finalStartYear)) {
    message = "Data available only from 1990 to 2014";
    finalStartYear = years[0];
  }
  if (!years.includes(finalEndYear)) {
    message = "Data available only from 1990 to 2014";
    finalEndYear = years[years.length - 1];
  }


  const indexOfStartYear = years.indexOf(finalStartYear);
  const indexOfEndYear = years.indexOf(finalEndYear);

  const validRequiredYearList = years.slice(indexOfStartYear, indexOfEndYear + 1);


  
  queryCategories.sort()
  var keyList = [queryCountry];
  keyList = keyList.concat(queryCategories);
  keyList.push(finalStartYear, finalEndYear);
  const key = keyList.join("_");


  //  Now we have list of years and messages along with category name are correct

  try {
    const response = await admin.firestore().collection("Pollution").doc(queryCountry).get();

    if (response) {
      const responseData = response.data();
      let finalData = {
        countryName: queryCountry,
        metaData: {
          requestedFromYear: queryStartYear,
          requestedToYear: queryEndYear,
          providingFromYear: finalStartYear,
          providingToYear: finalEndYear,
          requestedFor: queryCategories,
          providingDataStatus: "Complete",
        },
        message: message,
      };

      let partialData = 0;
      let missingDataIndividual = 0;

      queryCategories.forEach((innerItem) => {
        partialData = 0;
        finalData[innerItem] = {}; // Creating dictionaries for individual category
        // console.log(responseData[innerItem]);

        validRequiredYearList.forEach((year) => {
          finalData[innerItem][year] = responseData[innerItem][year];
          if (responseData[innerItem][year] === "NaN") {
            finalData["metaData"]["providingDataStatus"] = "Partial";
            partialData ++;
          }
        });
        if (partialData === validRequiredYearList.length) {
          missingDataIndividual ++;
          finalData["metaData"]["providingDataStatus"] = `Data unavailable for ${innerItem}`;
          // console.log(partialData)
        }
      });

      if (missingDataIndividual === queryCategories.length) {
        finalData["metaData"]["providingDataStatus"] = "No Data found for requested categories";
      }

      return res.status(200).json(finalData);
    } else {
      console.log("Something went wrong");
      return res.status(500).json({message: "Internal Server Error"});
    }
  } catch (error) {
    console.error("message: ", error);
    return res.status(500).json({message: "Internal Server Error"});
  }
  // ============================================================
});



bluesky.all("*", (req, res) => {
  res.status(404).json({message: "Resource not found"});
});


bluesky.listen(PORT, console.log(`Server is listening on port ${PORT}`))


