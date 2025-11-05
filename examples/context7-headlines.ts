#!/usr/bin/env tsx

/**
 * Example: fetch the README for a React-adjacent package from Context7
 * and print only the markdown headlines.
 */

import {
	createRuntime,
	createServerProxy,
	type CallResult,
} from "../src/index.js";

async function main(): Promise<void> {
	const runtime = await createRuntime();
	try {
		const context7 = createServerProxy(runtime, "context7");

		const resolveResult = (await context7.resolveLibraryId({
			libraryName: "react",
		})) as CallResult;
		const identifierText = resolveResult.text() ?? "";
		const idMatch = identifierText.match(
			/Context7-compatible library ID:\s*([^\s]+)/,
		);
		const target = idMatch?.[1];
		if (!target) {
			console.error("No Context7-compatible library ID resolved for React.");
			return;
		}

		const docs = (await context7.getLibraryDocs({
			context7CompatibleLibraryID: target,
		})) as CallResult;
		const markdown = docs.markdown() ?? docs.text() ?? "";
		const headlines = markdown
			.split("\n")
			.filter((line) => /^#+\s/.test(line))
			.join("\n");

		console.log(`# Headlines for ${target}`);
		console.log(headlines || "(no headlines found)");
	} finally {
		await runtime.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
