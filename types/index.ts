export type Tool = {
  id: number;
  name: string;
  comment: string;
  brand: string;
  favorite: boolean;
  what: string;
  category: string;
  link?: string;
};

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
};

export type Work = {
  id: number;
  type: string;
  organization: string;
  title: string;
  start_date: string;
  end_date?: string;
  comment: string;
  achievements: string[];
};

export type Certificate = {
  id: number;
  name: string;
  issue_date: string;
  comment: string;
  issuing_company: string;
  topics: string[];
  link: string;
  image_link: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  tags: string[]; // Tags as an array of strings
};

export type BlogPostData = {
  title: string;
  date: string;
  content: string;
  tags: string[]; // Explicitly type tags as an array of strings
};
