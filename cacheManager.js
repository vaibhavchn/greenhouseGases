var keys = {}
export var cacheData = {}
var cacheSize = 0;
export const keyCounter = (key, data) => {
  if (Object.keys(keys).includes(key)){
    keys[key] = keys[key] + 1; // incresing the count of query frequency
  } else {
    keys[key] = 1
  }
  if(Object.keys(cacheData).includes(key)){
    return;
  }
  if(cacheSize < 50) {
    cacheData[key] = data;
    cacheSize ++;
  } else {
    var smallestKeyCount = 99999999999999;
    var smallestKey = null;
    Object.keys(cacheData).map((item, index) => {
      if (keys[item] < smallestKeyCount) {
        smallestKey = item;
        smallestKeyCount = keys[item]
      }
    })
    // no we have the key that have a smallest key count
    if (keys[key] > keys[smallestKey]) {
      delete cacheData[smallestKey];
      cacheData[key] = data;
    }
  }
}
