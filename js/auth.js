const loginUrl = "https://learn.reboot01.com/api/auth/signin";

//login api point
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  //get all html element
  const id = document.getElementById("id").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("error");

  //send a sign in request and set the jwt token and redirect to the profile
  try {
    const token = await signin(id, password);
    localStorage.setItem("jwt", token);
    location.href = "profile.html";
  } catch (err) {
    error.textContent = "Invalid username/email or password";
  }
});

/*
signin: to send a sign in request and get the jwt token 

id: user idintification (eamil or username)

password: user password to sign in
*/
async function signin(id, password) {
  const basic = btoa(`${id}:${password}`);

  const res = await fetch(loginUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });

  if (!res.ok) throw new Error("Auth failed");

  const text = await res.text();

  //get rid of the " marks in the jwt
  const token = text.replace(/^"|"$/g, "").trim();

  return token.trim();
}

/*
logout: to  logout from your account by removing the jwt token
*/
function logout() {
  localStorage.removeItem("jwt");
  location.href = "login.html";
}
