import { D2Api, D2ApiDefault } from "d2-api";
import { UserConfig } from "../types";

/**
 * @param UserConfig: Configuration read from a JSON file and extended with default values
 * @returns d2-api instance with the provided user credentials
 */
export const initializeApi = ({ baseUrl, dhisUsername, dhisPassword }: UserConfig): D2Api => {
    return new D2ApiDefault({
        baseUrl,
        auth: { username: dhisUsername, password: dhisPassword },
    });
};
