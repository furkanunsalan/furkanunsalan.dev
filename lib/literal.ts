const LITERAL_API = "https://literal.club/graphql/";

export async function fetchCurrentlyReading(token: string) {
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

export async function literalLogin(email: string, password: string) {
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
