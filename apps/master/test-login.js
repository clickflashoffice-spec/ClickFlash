async function testLogin() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "clickflash.office@gmail.com",
      password: "STRONG_PASSWORD_PLACEHOLDER",
    }),
  });

  console.log('Status:', loginRes.status);
  const text = await loginRes.text();
  console.log('Body:', text);
}

testLogin();
