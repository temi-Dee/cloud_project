import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
});

export const submitProfile = (data: object) => api.post("/profile", data);
export const validateRegistration = (data: object) => api.post("/registration", data);
export const lookupInstitution = (data: object) => api.post("/lookup", data);
export const submitBiometrics = (data: object) => api.post("/biometrics", data);
export const uploadBiometricFile = async (file: Blob, type: string, registrationId: string) => {
  const { data } = await api.get(`/biometrics/upload-url?type=${type}&id=${registrationId}`);
  await axios.put(data.uploadUrl, file, { headers: { "Content-Type": "application/octet-stream" } });
  return data.key;
};
