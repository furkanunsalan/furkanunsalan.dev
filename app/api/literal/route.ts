import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering to prevent caching
export const dynamic = "force-dynamic";

const LITERAL_API = "https://api.literal.club/graphql/";

async function getLiteralToken() {
  const email = process.env.LITERAL_EMAIL;
  let password = process.env.LITERAL_PASSWORD;

  if (!email || !password) {
    throw new Error("Literal credentials not configured");
  }

  const query = `
    mutation login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        token
        email
        profile {
          id
          handle
          name
        }
      }
    }
  `;

  const res = await fetch(LITERAL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { email, password } }),
  });

  const { data, errors } = await res.json();
  if (errors) throw new Error(errors[0].message);
  return data.login.token;
}

async function fetchCurrentlyReading(token: string) {
  const query = `
    query {
      myReadingStates {
        status
        book {
          id
          cover
          pageCount
        }
      }
    }
  `;

  const res = await fetch(LITERAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  const json = await res.json();

  if (json.errors) {
    throw new Error(json.errors[0]?.message || "GraphQL error");
  }
  if (!json.data || !json.data.myReadingStates) {
    throw new Error(
      "No data returned from Literal Club API. Check your token.",
    );
  }

  return json.data.myReadingStates.filter(
    (s: any) => s.status === "IS_READING",
  );
}

async function fetchAllReadingStates(token: string) {
  const query = `
    fragment BookParts on Book {
      id
      slug
      title
      subtitle
      description
      isbn10
      isbn13
      language
      pageCount
      publishedDate
      publisher
      cover
      authors {
        id
        name
      }
      gradientColors
    }

    query {
      myReadingStates {
        id
        status
        bookId
        profileId
        createdAt
        book {
          ...BookParts
        }
      }
    }
  `;

  const res = await fetch(LITERAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  const json = await res.json();

  if (json.errors) {
    throw new Error(json.errors[0]?.message || "GraphQL error");
  }
  if (!json.data || !json.data.myReadingStates) {
    throw new Error(
      "No data returned from Literal Club API. Check your token.",
    );
  }

  return json.data.myReadingStates;
}

async function fetchReadingProgresses(token: string, bookIds: string[]) {
  if (bookIds.length === 0) return [];

  const query = `
    query readingProgresses($bookIds: [String!]!) {
      readingProgresses(bookIds: $bookIds, active: true) {
        bookId
        capacity
        createdAt
        id
        profileId
        progress
        unit
        completed
      }
    }
  `;

  const res = await fetch(LITERAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables: { bookIds },
    }),
    cache: "no-store",
  });

  const json = await res.json();

  if (json.errors) {
    console.error("Failed to fetch reading progresses:", json.errors);
    return [];
  }

  return json.data?.readingProgresses || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    const token = await getLiteralToken();

    if (all) {
      const readingStates = await fetchAllReadingStates(token);
      const readingBookIds = readingStates
        .filter((s: any) => s.status === "IS_READING")
        .map((s: any) => s.bookId);

      const progresses = await fetchReadingProgresses(token, readingBookIds);

      // Merge progresses with reading states
      const readingStatesWithProgress = readingStates.map((state: any) => {
        if (state.status === "IS_READING") {
          const progress = progresses.find(
            (p: any) => p.bookId === state.bookId,
          );
          return { ...state, progress };
        }
        return state;
      });

      return NextResponse.json({ books: readingStatesWithProgress });
    } else {
      const currentlyReading = await fetchCurrentlyReading(token);
      const readingBookIds = currentlyReading.map((s: any) => s.book.id);
      const progresses = await fetchReadingProgresses(token, readingBookIds);

      // Merge progresses with books
      const booksWithProgress = currentlyReading.map((item: any) => {
        const progress = progresses.find((p: any) => p.bookId === item.book.id);
        return { ...item, progress };
      });

      return NextResponse.json({ books: booksWithProgress });
    }
  } catch (error: any) {
    console.error("Error fetching Literal data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reading data" },
      { status: 500 },
    );
  }
}
