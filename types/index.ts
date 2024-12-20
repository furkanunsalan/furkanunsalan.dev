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
  title: string;
  short_description: string;
  update: string;
} & (
  | {
      private: false;
      repo: string;
      owner: string;
      branch: string;
    }
  | {
      private: true;
      long_description: string;
    }
);

export type Work = {
  id: number;
  organization: string;
  title: string;
  start_date: string;
  end_date?: string;
  comment: string;
  achievements?: string[];
  link?: string[]; // ["description", "url"]
};

export type Contribution = {
  id: number;
  project_name: string;
  description: string;
  link: string;
  tags?: string[];
}

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
  tags: string[];
};

export type BlogPostData = {
  title: string;
  date: string;
  content: string;
  tags: string[];
};
