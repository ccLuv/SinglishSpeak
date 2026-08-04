import { API_BASE_URL } from "../config";

export function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: API_BASE_URL + path,
      method: options.method || "GET",
      data: options.data || {},
      timeout: options.timeout || 20000,
      success: ({ data, statusCode }) => {
        if (statusCode >= 200 && statusCode < 300 && data.code === 200) {
          resolve(data.data ?? data);
        } else {
          reject(new Error(data?.msg || "请求失败"));
        }
      },
      fail: () => reject(new Error("无法连接后端，请检查服务及 API 地址")),
    });
  });
}

export function uploadAudio(filePath, formData = {}) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: API_BASE_URL + "/api/uploadAudio",
      filePath,
      name: "audio",
      formData,
      timeout: 300000,
      success: ({ data }) => {
        try {
          const body = JSON.parse(data);
          if (body.code === 200) resolve(body.data);
          else reject(new Error(body.msg || "录音上传或转写失败"));
        } catch {
          reject(new Error("服务器返回格式错误"));
        }
      },
      fail: () => reject(new Error("录音上传失败，请确认后端和转写服务正在运行")),
    });
  });
}
