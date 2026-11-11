const assert = require("node:assert/strict");
const test = require("node:test");
const { retireReleases } = require("./retire-releases.cjs");

const repo = "fixture/liverary";
const tag = "v1.2.17";
const token = "fixture-private-token";
const notice =
  "## 사용 중단\n\n이 버전은 사용을 중단했습니다. 설치·업데이트에는 [최신 정식 릴리스](https://github.com/fixture/liverary/releases/latest)를 사용해 주세요.\n\n---\n\n";

function release(id, tagName, overrides = {}) {
  return {
    id,
    tag_name: tagName,
    name: `Liverary ${tagName.slice(1)}`,
    body: `Notes for ${tagName}`,
    draft: false,
    prerelease: false,
    assets: [{ id: id * 10, name: "installer.exe" }],
    ...overrides,
  };
}

function github(releases, failure) {
  const state = structuredClone(releases);
  const updates = [];
  let latestId = 17;
  let failed = false;
  return {
    state,
    updates,
    latest: () => state.find((entry) => entry.id === latestId),
    fetch: async (input, options = {}) => {
      const url = new URL(input);
      const path = url.pathname.replace(`/repos/${repo}/`, "");
      const method = options.method ?? "GET";
      if (!failed && failure?.matches(path, method, url.searchParams)) {
        failed = true;
        if (failure.network) throw new Error(token);
        return Response.json({ message: token }, { status: failure.status });
      }
      if (method === "GET" && path === "releases/latest") {
        return Response.json(state.find((entry) => entry.id === latestId));
      }
      if (method === "GET" && path === "releases") {
        const page = Number(url.searchParams.get("page"));
        const size = Number(url.searchParams.get("per_page"));
        assert.ok(page > 0 && size === 100);
        return Response.json(state.slice((page - 1) * size, page * size));
      }
      if (method === "PATCH" && /^releases\/\d+$/.test(path)) {
        const entry = state.find((candidate) => candidate.id === Number(path.split("/")[1]));
        assert.ok(entry);
        const { make_latest: makeLatest, ...changes } = JSON.parse(options.body);
        if (makeLatest !== "false") latestId = entry.id;
        Object.assign(entry, changes);
        updates.push(entry.tag_name);
        return Response.json(entry);
      }
      throw new Error(`Unexpected fixture request: ${method} ${path}`);
    },
  };
}

test("retires only older published stable releases across pages and is safe to repeat", async () => {
  const retained = [
    release(17, tag),
    release(18, "v1.2.18"),
    release(19, "v2.0.0"),
    release(13, "v1.2.13", { draft: true }),
    release(14, "v1.2.14", { prerelease: true, name: "[사용 중단] Liverary 1.2.14" }),
    release(20, "v1.2.16-rc.1"),
    release(21, "nightly"),
  ];
  const padding = Array.from({ length: 100 - retained.length }, (_, index) =>
    release(100 + index, `draft-${index}`, { draft: true }),
  );
  const previous = release(16, "v1.2.16");
  const api = github([...retained, ...padding, previous]);

  assert.deepEqual(await retireReleases({ repo, tag, token, fetch: api.fetch }), ["v1.2.16"]);
  assert.deepEqual(api.state.slice(0, retained.length), retained);
  assert.equal(api.latest().id, 17);
  assert.deepEqual(api.state.at(-1), {
    ...previous,
    name: "[사용 중단] Liverary 1.2.16",
    body: notice + previous.body,
    prerelease: true,
  });
  assert.deepEqual(await retireReleases({ repo, tag, token, fetch: api.fetch }), []);
  assert.deepEqual(api.updates, ["v1.2.16"]);
});

for (const title of ["[사용 중단] Liverary 1.2.16", "[사용중단] Liverary 1.2.16"]) {
  test(`preserves an existing notice without duplicating the discontinued title: ${title}`, async () => {
    const previous = release(16, "v1.2.16", { name: title, body: notice + "Original notes" });
    const api = github([release(17, tag), previous]);
    await retireReleases({ repo, tag, token, fetch: api.fetch });
    assert.equal(api.state[1].name, "[사용 중단] Liverary 1.2.16");
    assert.equal(api.state[1].body, notice + "Original notes");
    assert.equal(api.state[1].prerelease, true);
  });
}

for (const latest of [
  release(17, "v1.2.18"),
  release(17, tag, { draft: true }),
  release(17, tag, { prerelease: true }),
]) {
  test(`refuses to retire releases for an unexpected latest release: ${JSON.stringify({ tag: latest.tag_name, draft: latest.draft, prerelease: latest.prerelease })}`, async () => {
    const original = [latest, release(16, "v1.2.16")];
    const api = github(original);
    await assert.rejects(retireReleases({ repo, tag, token, fetch: api.fetch }), /latest/);
    assert.deepEqual(api.state, original);
    assert.deepEqual(api.updates, []);
  });
}

for (const failure of [
  { matches: (path) => path === "releases/latest", status: 403 },
  { matches: (path) => path === "releases", status: 502 },
  { matches: (_path, method) => method === "PATCH", status: 422 },
  { matches: () => true, network: true },
]) {
  test(`reports a request failure without exposing credentials or response contents (${failure.status ?? "network"})`, async () => {
    const original = [release(17, tag), release(16, "v1.2.16")];
    const api = github(original, failure);
    await assert.rejects(retireReleases({ repo, tag, token, fetch: api.fetch }), (error) => {
      assert.doesNotMatch(error.message, new RegExp(token));
      if (failure.status) assert.match(error.message, new RegExp(String(failure.status)));
      return true;
    });
    assert.deepEqual(api.state, original);
    assert.equal(api.latest().id, 17);
  });
}

test("continues a partially completed retirement without repeating earlier changes", async () => {
  const api = github([release(17, tag), release(16, "v1.2.16"), release(15, "v1.2.15")], {
    matches: (path, method) => method === "PATCH" && path === "releases/15",
    status: 503,
  });
  await assert.rejects(retireReleases({ repo, tag, token, fetch: api.fetch }), /503/);
  assert.equal(api.state[1].prerelease, true);
  assert.equal(api.state[2].prerelease, false);
  assert.deepEqual(await retireReleases({ repo, tag, token, fetch: api.fetch }), ["v1.2.15"]);
  assert.deepEqual(api.updates, ["v1.2.16", "v1.2.15"]);
  assert.equal(api.latest().id, 17);
});
