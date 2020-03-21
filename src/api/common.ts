import { D2Api, D2ApiDefault } from "d2-api";
import { UserConfig } from "../types";

export const initializeApi = ({ baseUrl, dhisUsername, dhisPassword }: UserConfig): D2Api => {
    return new D2ApiDefault({
        baseUrl,
        auth: { username: dhisUsername, password: dhisPassword },
    });
};
