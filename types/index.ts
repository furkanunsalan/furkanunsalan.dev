export type Tool = {
    id: number;
    name: string;
    comment: string;
    brand: string;
    favorite: boolean;
    what: string;
    category: string;
    link?: string
}

export type Project = {
    id: number;
    slug: string;
    image?: string;
    title: string;
    short_description: string;
    description: string;
    link?: string;
    github?: string;
    update: string;
}