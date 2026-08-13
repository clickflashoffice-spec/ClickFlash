import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
export const REPOSITORY_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

const PRIVATE_KEY_CONTAINER_PATTERN = /\.(?:jks|keystore|p12|pfx)$/i;
const PRIVATE_KEY_MATERIAL_PATTERN = /\.(?:key|pem)$/i;
const PRIVATE_KEY_TOKEN_PATTERN =
  /(?:^|[-_.])private(?:[-_.]?key)?(?:$|[-_.])/i;
const OPENSSH_PRIVATE_KEY_PATTERN = /^id_(?:dsa|ecdsa|ed25519|rsa)$/i;

export function isPrivateKeyFilename(candidatePath) {
  const normalizedPath = candidatePath.replaceAll("\\", "/");
  const basename = path.posix.basename(normalizedPath);

  if (PRIVATE_KEY_CONTAINER_PATTERN.test(basename)) {
    return true;
  }

  if (OPENSSH_PRIVATE_KEY_PATTERN.test(basename)) {
    return true;
  }

  if (!PRIVATE_KEY_MATERIAL_PATTERN.test(basename)) {
    return false;
  }

  const stem = basename.replace(PRIVATE_KEY_MATERIAL_PATTERN, "");
  return PRIVATE_KEY_TOKEN_PATTERN.test(stem);
}

export function findTrackedPrivateKeyFilenames(trackedPaths) {
  return trackedPaths.filter(isPrivateKeyFilename);
}

export function listTrackedPaths(repositoryRoot = REPOSITORY_ROOT) {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

  return output.split("\0").filter(Boolean);
}

function pathsMatch(left, right) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);

  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && pathsMatch(invokedPath, SCRIPT_PATH)) {
  const violations = findTrackedPrivateKeyFilenames(listTrackedPaths());

  if (violations.length > 0) {
    process.stderr.write(
      "Tracked private-key filenames are forbidden. Remove them through the approved credential-containment process:\n",
    );
    for (const violation of violations) {
      process.stderr.write(`- ${violation}\n`);
    }
    process.exitCode = 1;
  } else {
    process.stdout.write("No tracked private-key filenames found.\n");
  }
}
