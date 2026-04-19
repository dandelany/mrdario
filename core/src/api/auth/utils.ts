import { AppAuthToken } from "./types.js";

export function isAuthToken(authToken?: { [K in string]: any } | null): authToken is AppAuthToken {
  return (
    !!authToken &&
    typeof authToken.id === "string" &&
    !!authToken.id.length &&
    typeof authToken.name === "string"
  );
}
