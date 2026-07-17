
import axios from 'axios';


let userId = '', token = localStorage.getItem('token') || '';

let divicesToken = "BCACAFFC658149958B6401A3F0179281"

// let BASE_URL = 'http://182.40.36.93:8900';
// let BASE_URL = 'http://110.42.225.206:8280';
 let BASE_URL =  ""

/**
* 
* @param {
*  username: 'ktdz',
*  password: 'ktdz',,
* } params 
* @returns 
*/ 
export const  getToken = (params={}) => {
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
export const queryDevStatus = (params={}) => {
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
export const queryInsectImagesByTimeRange = (params={}) => {
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
export const insectStatistic = (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/iotservice/insect/api/insectStatistic?${optionns}`
  return axios.post(url, params).then((res) => {
    return res.data
  });
}
// 获取数据趋势
/**
 * 
 * @param {
 *  clientId,
 *  hours
 * } params 
 * @returns 
 */
export const getDeviceTrend = (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/api/device/trend?${optionns}`
  return axios.get(url, params).then((res) => {
    return res.data
  });
}
// 获取统计数据
/**
 * 
 * @param {
 *  clientId,
 * } params 
 * @returns 
 */
export const getDeviceStatistics = (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/api/device/statistics?${optionns}`
  return axios.get(url, params).then((res) => {
    return res.data
  });
}
// 获取虫情统计
/**
 * 
 * @param {
 *  imei,
 *  startDate,
 *  endDate,
 * } params 
 * @returns 
 */
export const getInsectStatistics = (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/api/insect/statistics?${optionns}`
  return axios.get(url, params).then((res) => {
    return res.data
  });
}

// 获取最新虫情数据
/**
 * 
 * @param {
 *  imei,
 *  hours,
 *  endDate,
 * } params 
 * @returns 
 */
export const getInsectLatest = (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/api/insect/latest?${optionns}`
  return axios.get(url, params).then((res) => {
    return res.data
  });
}

// 获取虫情设备列表
/**
 * 
 * @param {
 *  imei,
 *  hours,
 *  endDate,
 * } params 
 * @returns 
 */
export const getInsectDivices = (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/api/insect/divices?${optionns}`
  return axios.get(url, params).then((res) => {
    return res.data
  });
}

// 获取最新虫情设备列表
/**
 * 
 * @param {
 *  page,
 *  size
 * } params 
 * @returns 
 */
export const getInsectDevicesLocal = (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/api/insect/devices/local?${optionns}`
  return axios.get(url, params).then((res) => {
    return res.data
  });
}

// 获取最新虫情数据列表
/**
 * 
 * @param {
 *  imei,
 *  hours,
 *  endDate,
 *  page,
 *  size
 * } params 
 * @returns 
 */
// export const getInsectDataList = (params={}) => {
//   const optionns = objectToUrlParams(params)
//   const url =`${BASE_URL}/api/insect/data/list?${optionns}`
//   return axios.get(url, params).then((res) => {
//     return res.data
//   });
// }

// 获取系统总览数据
/**
 * 
 * @param {
 * } params 
 * @returns 
 */
export const getDeviceDashboard = (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/api/device/dashboard/overview?${optionns}`
  return axios.get(url, params).then((res) => {
    return res.data
  });
}
// 获取系统总览数据
/**
 * 
 * @param {
 * } params 
 * @returns 
 */
export const getOverview = (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/api/overview?${optionns}`
  return axios.get(url, params).then((res) => {
    return res.data
  });
}

// 获取烘干塔传感器数据
/**
 * 
 * @param {
 * } params 
 * @returns 
 */
export const getDryingSensors= (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/api/drying/sensors?${optionns}`
  return axios.get(url, params).then((res) => {
    return res.data
  });
}
// 获取仓库传感器数据
/**
 * 
 * @param {
 * } params 
 * @returns 
 */
export const getStorageSensors= (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/api/storage/sensors?${optionns}`
  return axios.get(url, params).then((res) => {
    return res.data
  });
}
// 获取试验田传感器数据
/**
 * 
 * @param {
 * } params 
 * @returns 
 */
export const getTestfieldSensors= (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/api/testfield/sensors?${optionns}`
  return axios.get(url, params).then((res) => {
    return res.data
  });
}
// 获取设施详情
/**
 * 
 * @param {
 * } params 
 * @returns 
 */
export const getFacilityDetail= (params={}) => {
  const optionns = objectToUrlParams(params)
  const url =`${BASE_URL}/api/facility/${params.id}`
  return axios.get(url, params).then((res) => {
    return res.data
  });
}

// 获取所有设施
/**
 * 
 * @param {
 * } params 
 * @returns 
 */
export const getListAllDevices= (params={}) => {
  params.token=divicesToken
  const url =`${BASE_URL}/hualin-video/api/iot/manage/api/listAllDevices`
  return axios.post(url, params).then((res) => {
    return res.data
  });
}
// 获取设施详情
/**
 * 
 * @param {
 * } params 
 * @returns 
 */
export const getDeviceValues= (params={}) => {
  params.token=divicesToken
  const url =`${BASE_URL}/hualin-video/api/iot/manage/api/deviceValues`
  return axios.post(url, params).then((res) => {
    return res.data
  });
}

// 获取虫情列表详情
/**
 * 
 * @param {
 * } params 
 * @returns 
 */
export const getInsectDataList= (params={}) => {
    params.token=divicesToken
    const optionns = objectToUrlParams(params)
    const url =`${BASE_URL}/api/insect/data/list?${optionns}`
    return axios.get(url, params).then((res) => {
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