const nock = require("nock");
const { getUserPages } = require("../src/services/facebookService");

describe("facebook service", () => {
  afterEach(() => nock.cleanAll());

  it("filters only pages with publish permissions", async () => {
    nock("https://graph.facebook.com")
      .get("/v20.0/me/accounts")
      .query(true)
      .reply(200, {
        data: [
          { id: "1", name: "Allowed", perms: ["CREATE_CONTENT"], access_token: "a" },
          { id: "2", name: "Denied", perms: ["MODERATE"], access_token: "b" }
        ]
      });

    const pages = await getUserPages("token");
    expect(pages).toHaveLength(1);
    expect(pages[0].name).toBe("Allowed");
  });
});
