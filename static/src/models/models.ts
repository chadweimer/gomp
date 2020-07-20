export interface Search {
    query: string;
    fields: string[];
    tags: string[];
    pictures: string[];
}

export interface User {
    id: number;
    username: string;
    accessLevel: string;
}
