import { client } from '@/lib/literalClient';

const currentlyReadingQuery = `
  query currentlyReading($userId: ID!) {
    user(id: $userId) {
      currentlyReading {
        id
        book {
          id
          title
          author
          cover
        }
      }
    }
  }
`;

// Define TypeScript types for the response structure
type Book = {
  id: string;
  title: string;
  author: string;
  cover: string;
};

type CurrentlyReadingResponse = {
  user: {
    currentlyReading: {
      id: string;
      book: Book;
    }[];
  };
};

export async function getCurrentlyReadingBooks(userId: string): Promise<Book[]> {
  const variables = { userId };

  // Explicitly type the response
  const response = await client.request<CurrentlyReadingResponse>(currentlyReadingQuery, variables);

  return response.user.currentlyReading.map((entry) => entry.book);
}
