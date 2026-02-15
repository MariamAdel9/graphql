const api = "https://learn.reboot01.com/api/graphql-engine/v1/graphql";

//function to invoke the api point
async function query(query) {
  //get the jwt token
  let token = localStorage.getItem("jwt");

  //if there is no token then mqke the user login
  if (!token) {
    throw new Error("please login");
  }

  //post request to the api point
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json();

  if (json.errors) {
    throw new Error(json.errors.map((e) => e.message).join(", "));
  }

  //return the response from the api point
  return json.data;
}
