import { beforeEach, describe, expect, it } from "vitest";
import { parseEnvString, smartEnvMerge } from "@/utils/envParser.ts";

interface ITestEntry {
	key: string;
	value: string;
	id: string;
}

let nextId = 0;
const createEntry = (key: string, value: string): ITestEntry => ({
	key,
	value,
	id: `entry-${String(nextId++)}`,
});

describe("smartEnvMerge", () => {
	beforeEach(() => {
		nextId = 0;
	});

	describe("basic merge behavior", () => {
		it("adds new keys not present in existing", () => {
			const existing = [createEntry("A", "1")];
			const result = smartEnvMerge(existing, "B=2\nC=3", createEntry);

			expect(result.added).toEqual(["B", "C"]);
			expect(result.updated).toEqual([]);
			expect(result.entries).toHaveLength(3);
			expect(result.entries[1].key).toBe("B");
			expect(result.entries[1].value).toBe("2");
			expect(result.entries[2].key).toBe("C");
			expect(result.entries[2].value).toBe("3");
		});

		it("updates existing keys with new values", () => {
			const existing = [createEntry("A", "old"), createEntry("B", "keep")];
			const result = smartEnvMerge(existing, "A=new", createEntry);

			expect(result.updated).toEqual(["A"]);
			expect(result.added).toEqual([]);
			expect(result.entries).toHaveLength(2);
			expect(result.entries[0].key).toBe("A");
			expect(result.entries[0].value).toBe("new");
			expect(result.entries[1].key).toBe("B");
			expect(result.entries[1].value).toBe("keep");
		});

		it("reports unchanged when value is the same", () => {
			const existing = [createEntry("A", "same")];
			const result = smartEnvMerge(existing, "A=same", createEntry);

			expect(result.unchanged).toEqual(["A"]);
			expect(result.updated).toEqual([]);
			expect(result.added).toEqual([]);
			expect(result.entries).toHaveLength(1);
			expect(result.entries[0].value).toBe("same");
		});

		it("preserves existing keys not mentioned in paste", () => {
			const existing = [
				createEntry("A", "1"),
				createEntry("B", "2"),
				createEntry("C", "3"),
			];
			const result = smartEnvMerge(existing, "B=updated", createEntry);

			expect(result.entries).toHaveLength(3);
			expect(result.entries[0].key).toBe("A");
			expect(result.entries[0].value).toBe("1");
			expect(result.entries[1].key).toBe("B");
			expect(result.entries[1].value).toBe("updated");
			expect(result.entries[2].key).toBe("C");
			expect(result.entries[2].value).toBe("3");
		});
	});

	describe("deduplication within pasted block", () => {
		it("last occurrence wins for duplicate keys in paste", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(
				existing,
				"A=first\nB=val\nA=last",
				createEntry,
			);

			expect(result.added).toEqual(["A", "B"]);
			expect(result.ignored).toEqual([
				"A (duplicate in paste, last value used)",
			]);
			expect(result.entries).toHaveLength(2);
			const entryA = result.entries.find((e) => e.key === "A");
			expect(entryA?.value).toBe("last");
		});

		it("handles multiple duplicates in paste", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(
				existing,
				"X=1\nX=2\nX=3\nY=a\nY=b",
				createEntry,
			);

			expect(result.ignored).toHaveLength(3); // X appears 3 times (2 dupes), Y 2 times (1 dupe)
			const entryX = result.entries.find((e) => e.key === "X");
			const entryY = result.entries.find((e) => e.key === "Y");
			expect(entryX?.value).toBe("3");
			expect(entryY?.value).toBe("b");
		});
	});

	describe("preserves existing key order", () => {
		it("maintains insertion order of existing entries", () => {
			const existing = [
				createEntry("Z", "z"),
				createEntry("A", "a"),
				createEntry("M", "m"),
			];
			const result = smartEnvMerge(existing, "A=updated\nN=new", createEntry);

			expect(result.entries[0].key).toBe("Z");
			expect(result.entries[1].key).toBe("A");
			expect(result.entries[1].value).toBe("updated");
			expect(result.entries[2].key).toBe("M");
			expect(result.entries[3].key).toBe("N");
		});

		it("appends new keys at the end", () => {
			const existing = [createEntry("A", "1"), createEntry("B", "2")];
			const result = smartEnvMerge(existing, "C=3\nD=4", createEntry);

			expect(result.entries.map((e) => e.key)).toEqual(["A", "B", "C", "D"]);
		});
	});

	describe("idempotency", () => {
		it("applying the same paste twice produces the same result", () => {
			const existing = [createEntry("A", "1"), createEntry("B", "2")];
			const paste = "A=new\nC=3";

			const first = smartEnvMerge(existing, paste, createEntry);
			const second = smartEnvMerge(first.entries, paste, createEntry);

			expect(
				second.entries.map((e) => ({ key: e.key, value: e.value })),
			).toEqual(first.entries.map((e) => ({ key: e.key, value: e.value })));
			expect(second.updated).toEqual([]);
			expect(second.added).toEqual([]);
			expect(second.unchanged).toEqual(["A", "C"]);
		});
	});

	describe("non-destructive behavior", () => {
		it("never removes existing keys", () => {
			const existing = [
				createEntry("KEEP_ME", "important"),
				createEntry("ALSO_KEEP", "value"),
			];
			const result = smartEnvMerge(existing, "NEW_KEY=new", createEntry);

			expect(result.entries).toHaveLength(3);
			expect(result.entries.find((e) => e.key === "KEEP_ME")?.value).toBe(
				"important",
			);
			expect(result.entries.find((e) => e.key === "ALSO_KEEP")?.value).toBe(
				"value",
			);
		});

		it("does not mutate the original array", () => {
			const existing = [createEntry("A", "1")];
			const originalRef = existing[0];
			smartEnvMerge(existing, "A=updated", createEntry);

			expect(originalRef.value).toBe("1");
			expect(existing[0].value).toBe("1");
		});
	});

	describe("comment and empty line handling", () => {
		it("ignores lines starting with #", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(
				existing,
				"# This is a comment\nA=1\n# Another comment\nB=2",
				createEntry,
			);

			expect(result.entries).toHaveLength(2);
			expect(result.added).toEqual(["A", "B"]);
		});

		it("ignores empty lines", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(existing, "\nA=1\n\n\nB=2\n", createEntry);

			expect(result.entries).toHaveLength(2);
			expect(result.added).toEqual(["A", "B"]);
		});

		it("strips inline comments outside quoted values", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(
				existing,
				"A=value # this is a comment",
				createEntry,
			);

			expect(result.entries[0].value).toBe("value");
		});

		it("preserves inline # inside quoted values", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(
				existing,
				'A="value # not a comment"',
				createEntry,
			);

			expect(result.entries[0].value).toBe("value # not a comment");
		});
	});

	describe(".env format support", () => {
		it("handles KEY=value format", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(existing, "KEY=value", createEntry);

			expect(result.entries[0].key).toBe("KEY");
			expect(result.entries[0].value).toBe("value");
		});

		it("handles double-quoted values with spaces", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(
				existing,
				'KEY="value with spaces"',
				createEntry,
			);

			expect(result.entries[0].value).toBe("value with spaces");
		});

		it("handles single-quoted values with spaces", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(
				existing,
				"KEY='value with spaces'",
				createEntry,
			);

			expect(result.entries[0].value).toBe("value with spaces");
		});

		it("allows equals signs inside quoted values", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(
				existing,
				'DB_URL="postgres://user:pass@host/db?opt=val"',
				createEntry,
			);

			expect(result.entries[0].value).toBe(
				"postgres://user:pass@host/db?opt=val",
			);
		});

		it("handles empty values", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(existing, "EMPTY=", createEntry);

			expect(result.entries[0].key).toBe("EMPTY");
			expect(result.entries[0].value).toBe("");
		});
	});

	describe("edge cases", () => {
		it("returns unchanged existing entries for empty paste", () => {
			const existing = [createEntry("A", "1")];
			const result = smartEnvMerge(existing, "", createEntry);

			expect(result.entries).toHaveLength(1);
			expect(result.added).toEqual([]);
			expect(result.updated).toEqual([]);
		});

		it("returns unchanged existing entries for whitespace-only paste", () => {
			const existing = [createEntry("A", "1")];
			const result = smartEnvMerge(existing, "   \n\n  ", createEntry);

			expect(result.entries).toHaveLength(1);
			expect(result.added).toEqual([]);
		});

		it("handles paste with no valid entries", () => {
			const existing = [createEntry("A", "1")];
			const result = smartEnvMerge(
				existing,
				"no equals here\nanother line",
				createEntry,
			);

			expect(result.entries).toHaveLength(1);
			expect(result.added).toEqual([]);
		});

		it("handles empty existing entries", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(existing, "A=1\nB=2", createEntry);

			expect(result.entries).toHaveLength(2);
			expect(result.added).toEqual(["A", "B"]);
		});

		it("skips entries with empty keys in existing when matching", () => {
			const existing = [createEntry("", "orphan_value"), createEntry("A", "1")];
			const result = smartEnvMerge(existing, "A=updated\nB=new", createEntry);

			expect(result.entries).toHaveLength(3);
			expect(result.entries[0].key).toBe("");
			expect(result.entries[1].value).toBe("updated");
		});

		it("handles Windows-style line endings", () => {
			const existing: ITestEntry[] = [];
			const result = smartEnvMerge(existing, "A=1\r\nB=2\r\nC=3", createEntry);

			expect(result.entries).toHaveLength(3);
			expect(result.added).toEqual(["A", "B", "C"]);
		});
	});

	describe("determinism", () => {
		it("produces same output regardless of paste order for new keys", () => {
			const existing = [createEntry("X", "x")];
			const paste1 = "A=1\nB=2\nC=3";
			const paste2 = "C=3\nB=2\nA=1";

			const result1 = smartEnvMerge(existing, paste1, createEntry);
			const result2 = smartEnvMerge(existing, paste2, createEntry);

			// Both should have same keys with same values
			const keys1 = new Set(result1.entries.map((e) => e.key));
			const keys2 = new Set(result2.entries.map((e) => e.key));
			expect(keys1).toEqual(keys2);

			for (const entry of result1.entries) {
				const match = result2.entries.find((e) => e.key === entry.key);
				expect(match?.value).toBe(entry.value);
			}
		});
	});

	describe("combined scenarios", () => {
		it("handles mixed add, update, unchanged, and ignored", () => {
			const existing = [
				createEntry("A", "old_a"),
				createEntry("B", "keep_b"),
				createEntry("C", "same_c"),
			];
			const paste = "A=new_a\nC=same_c\nD=new_d\nA=newer_a";
			const result = smartEnvMerge(existing, paste, createEntry);

			expect(result.updated).toEqual(["A"]);
			expect(result.unchanged).toEqual(["C"]);
			expect(result.added).toEqual(["D"]);
			expect(result.ignored).toEqual([
				"A (duplicate in paste, last value used)",
			]);
			expect(result.entries).toHaveLength(4);
			expect(result.entries[0].value).toBe("newer_a");
			expect(result.entries[1].value).toBe("keep_b");
			expect(result.entries[2].value).toBe("same_c");
			expect(result.entries[3].value).toBe("new_d");
		});
	});
});

describe("parseEnvString", () => {
	it("parses basic KEY=VALUE pairs", () => {
		const result = parseEnvString("A=1\nB=hello");
		expect(result).toEqual([
			{ key: "A", value: "1" },
			{ key: "B", value: "hello" },
		]);
	});

	it("handles quoted values with equals signs", () => {
		const result = parseEnvString('URL="http://host?a=1&b=2"');
		expect(result[0].value).toBe("http://host?a=1&b=2");
	});

	it("handles single-quoted values", () => {
		const result = parseEnvString("MSG='hello world'");
		expect(result[0].value).toBe("hello world");
	});

	it("strips inline comments from unquoted values", () => {
		const result = parseEnvString("KEY=value # comment");
		expect(result[0].value).toBe("value");
	});

	it("preserves # in quoted values", () => {
		const result = parseEnvString('KEY="value # not comment"');
		expect(result[0].value).toBe("value # not comment");
	});

	it("returns empty array for empty input", () => {
		expect(parseEnvString("")).toEqual([]);
		expect(parseEnvString("   ")).toEqual([]);
	});

	it("skips comment lines", () => {
		const result = parseEnvString("# comment\nA=1\n# another\nB=2");
		expect(result).toHaveLength(2);
	});

	it("skips lines without equals", () => {
		const result = parseEnvString("no_equals\nA=1");
		expect(result).toHaveLength(1);
		expect(result[0].key).toBe("A");
	});
});
