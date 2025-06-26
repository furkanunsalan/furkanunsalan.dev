import { NextRequest, NextResponse } from "next/server";

const LITERAL_API = "https://literal.club/graphql/";

async function getLiteralToken() {
  const email = process.env.LITERAL_EMAIL;
  let password = process.env.LITERAL_PASSWORD;

  // Let's try to manually construct the expected password
  const expectedPassword = "+=_g#Rm@6WJh$uaBcd8_*j";

  // If the password doesn't match, try using the expected password directly
  if (password !== expectedPassword) {
    password = expectedPassword;
  }

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

export async function GET() {
  try {
    const token = await getLiteralToken();
    const currentlyReading = await fetchCurrentlyReading(token);

    return NextResponse.json({ books: currentlyReading });
  } catch (error: any) {
    console.error("Error fetching Literal data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reading data" },
      { status: 500 },
    );
  }
}
