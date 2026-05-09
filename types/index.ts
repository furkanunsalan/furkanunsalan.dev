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
  banner?: string;
  excerpt?: string;
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

export type CustomProject = {
  slug: string;
  name: string;
  description: string;
  metric: string;
  link: string;
  language?: string;
  order: number;
  image?: string;
};

export type ProjectCardData =
  | {
      kind: "github";
      slug: string;
      name: string;
      description: string | null;
      language: string | null;
      stargazers_count: number;
      forks_count: number;
    }
  | {
      kind: "custom";
      slug: string;
      name: string;
      description: string;
      language?: string;
      metric: string;
      link: string;
      image?: string;
    };
