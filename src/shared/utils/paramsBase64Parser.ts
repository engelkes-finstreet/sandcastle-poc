import { createParser } from "nuqs/server";

export function createBase64Parser<T>() {
  return createParser({
    parse(queryValue) {
      try {
        const decoded = atob(queryValue);
        return JSON.parse(decoded) as T;
      } catch (error) {
        console.error("Failed to decode Base64 string:", error);
        return {} as T;
      }
    },
    serialize(value) {
      try {
        const jsonString = JSON.stringify(value);
        return btoa(jsonString);
      } catch (error) {
        console.error("Failed to encode JSON to Base64:", error);
        return "";
      }
    },
  });
}
