
import axios from 'axios';


let userId = '', token = localStorage.getItem('token') || '';

let BASE_URL = 'http://182.40.36.93:8900';

/**
* 
* @param {
*  username: 'ktdz',
*  password: 'ktdz',,
* } params 
* @returns 
*/ 
export const  getToken = (params) => {
  const optionns = objectToUrlParams(params)
  const url = `${BASE_URL}/iotservice/insect/api/queryKey?${optionns}`
  return axios.post(url, params).then((res) => {
    return res.data
  });
}


// 获取数据
/**
 * 
 * @param {
 *  token,
 *  appName
 * } params 
 * @returns 
 */
export const queryDevStatus = (params) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/iotservice/insect/api/queryDevStatus?${optionns}`
  return axios.post(url, params).then((res) => {
    return res.data
  });
}

// 获取数据
/**
 * 
 * @param {
 *  token,
 *  appName,
 *  stime,  // YYYY-MM-DD HH:mm:ss
 *  etime,  // YYYY-MM-DD HH:mm:ss
 *  imei
 * } params 
 * @returns 
 */
export const queryInsectImagesByTimeRange = (params) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/iotservice/insect/api/queryInsectImagesByTimeRange?${optionns}`
  return axios.post(url, params).then((res) => {
    return res.data
  });
}
// 获取数据
/**
 * 
 * @param {
 *  token,
 *  appName,
 *  stime, // YYYY-MM-DD HH:mm:ss
 *  etime, // YYYY-MM-DD HH:mm:ss
 *  imei
 * } params 
 * @returns 
 */
export const insectStatistic = (params) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/iotservice/insect/api/insectStatistic?${optionns}`
  return axios.post(url, params).then((res) => {
    return res.data
  });
}

function objectToUrlParams(obj) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) {
            params.append(key, value);
        }
    }
    return params.toString();
}