const fetch = require('node-fetch');

async function testSearch() {
  try {
    const res = await fetch("http://localhost:5000/api/search?q=apple");
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

testSearch();
