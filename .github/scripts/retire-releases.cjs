function stableVersion(tag) {
  if (typeof tag !== "string") return null;
  const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag);
  return match ? match.slice(1).map((part) => BigInt(part)) : null;
}

function olderThan(version, latest) {
  for (let index = 0; index < version.length; index += 1) {
    if (version[index] !== latest[index]) return version[index] < latest[index];
  }
  return false;
}

async function retireReleases({ repo, tag, token, fetch: requestFetch = globalThis.fetch }) {
  const version = stableVersion(tag);
  if (!repo || !token || !version) {
    throw new Error("GH_REPO, GH_TOKEN and a stable vX.Y.Z release tag are required.");
  }

  async function request(path, payload) {
    let response;
    try {
      response = await requestFetch(`https://api.github.com/repos/${repo}/${path}`, {
        method: payload === undefined ? "GET" : "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          ...(payload === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      });
    } catch {
      throw new Error("GitHub request failed.");
    }
    if (!response.ok) throw new Error(`GitHub request failed (${response.status}).`);
    if (payload !== undefined) return;
    try {
      return await response.json();
    } catch {
      throw new Error("GitHub returned invalid JSON.");
    }
  }

  const latest = await request("releases/latest");
  if (latest?.tag_name !== tag || latest.draft !== false || latest.prerelease !== false) {
    throw new Error("The expected release is not the latest published stable release.");
  }

  const notice = `## 사용 중단\n\n이 버전은 사용을 중단했습니다. 설치·업데이트에는 [최신 정식 릴리스](https://github.com/${repo}/releases/latest)를 사용해 주세요.\n\n---\n\n`;
  const retired = [];
  for (let page = 1; ; page += 1) {
    const releases = await request(`releases?per_page=100&page=${page}`);
    if (!Array.isArray(releases)) throw new Error("GitHub returned an invalid release list.");
    for (const release of releases) {
      const candidate = stableVersion(release.tag_name);
      if (
        release.id === latest.id ||
        release.draft !== false ||
        release.prerelease !== false ||
        !candidate ||
        !olderThan(candidate, version)
      ) {
        continue;
      }
      const name = (release.name || release.tag_name).replace(/^(?:\[사용\s*중단\]\s*)+/, "");
      const body = release.body || "";
      await request(`releases/${release.id}`, {
        name: `[사용 중단] ${name}`,
        body: body.startsWith(notice) ? body : notice + body,
        prerelease: true,
        make_latest: "false",
      });
      retired.push(release.tag_name);
    }
    if (releases.length < 100) break;
  }
  return retired;
}

module.exports = { retireReleases };

if (require.main === module) {
  retireReleases({ repo: process.env.GH_REPO, tag: process.argv[2], token: process.env.GH_TOKEN })
    .then((retired) =>
      console.log(`Marked ${retired.length} older Liverary release(s) as discontinued.`),
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
