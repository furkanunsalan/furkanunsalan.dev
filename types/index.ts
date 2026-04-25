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

export type Experience = {
  id: number;
  order: number;
  organization: string;
  title: string;
  start_date: string;
  end_date?: string;
  comment: string;
  links?: { label: string; url: string }[];
  images?: string[];
};

export type Contribution = {
  id: number;
  project_name: string;
  description: string;
  link: string;
  tags?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  tags: string[];
};

export type BlogPostData = {
  title: string;
  date: string;
  content: string;
  tags: string[];
};

export type Route = {
  name: string;
  url: string;
};

export type Routes = Route[];
