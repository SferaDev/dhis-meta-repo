export interface MetadataChange {
    model: string;
    id: string;
    name: string;
    lastUpdated?: Date;
    lastUpdatedBy?: {
        id: string;
        name: string;
        userCredentials: {
            username: string;
        };
    };
}
