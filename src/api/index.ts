import { D2Api } from "@eyeseetea/d2-api/2.34";
import { UserConfig } from "../types";

/**
 * @param UserConfig: Configuration read from a JSON file and extended with default values
 * @returns d2-api instance with the provided user credentials
 */
export const initializeApi = ({ baseUrl, dhisUsername, dhisPassword }: UserConfig): D2Api => {
    return new D2Api({
        baseUrl,
        auth: { username: dhisUsername, password: dhisPassword },
    });
};
