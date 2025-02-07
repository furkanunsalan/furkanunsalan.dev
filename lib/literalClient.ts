import { GraphQLClient } from 'graphql-request';

const endpoint = 'https://literal.club/graphql/';

// Create a client instance without auth header by default
export const client = new GraphQLClient(endpoint);

// Define types for the API responses
type Profile = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  image: string;
};

type LoginResponse = {
  login: {
    token: string;
    email: string;
    profile: Profile;
  };
};

type Author = {
  name: string;
};

type Book = {
  id: string;
  title: string;
  cover: string;
  authors: Author[];
};

type ReadingState = {
  status: string;
  book: Book;
};

type ReadingStatesResponse = {
  myReadingStates: ReadingState[];
};

type FormattedBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
};

// Function to set auth token after login
export const setAuthToken = (token: string) => {
  client.setHeader('Authorization', `Bearer ${token}`);
};

// Login mutation
export async function login(email: string, password: string): Promise<LoginResponse> {
  const loginMutation = `
    mutation login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        token
        email
        profile {
          id
          handle
          name
          bio
          image
        }
      }
    }
  `;

  return client.request<LoginResponse>(loginMutation, { email, password });
}

// Get currently reading books query
export async function getCurrentlyReadingBooks(): Promise<FormattedBook[]> {
  const query = `
    query myReadingStates {
      myReadingStates {
        status
        book {
          id
          title
          cover
          authors {
            name
          }
        }
      }
    }
  `;

  const response = await client.request<ReadingStatesResponse>(query);
  // Filter for only currently reading books and format the response
  return response.myReadingStates
    .filter((state) => state.status === 'IS_READING')
    .map((state) => ({
      id: state.book.id,
      title: state.book.title,
      author: state.book.authors.map(a => a.name).join(', '),
      cover: state.book.cover
    }));
}
