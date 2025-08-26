#!/usr/bin/env tsx
/**
 * Action Roadmap Generator CLI
 *
 * A command-line interface for generating action roadmaps from user queries.
 * Reads a query from a text file and outputs the generated AI-ready prompt.
 *
 * Usage:
 *   npx tsx scripts/action-roadmap-cli.ts <input-file.txt>
 *   npx tsx scripts/action-roadmap-cli.ts --full <input-file.txt>
 *   npx tsx scripts/action-roadmap-cli.ts --verbose <input-file.txt>
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { program } from "commander";
import dotenv from "dotenv";

// Load environment variables FIRST before importing any modules that use them
// Try different environment files in order of preference
const envFiles = [".env.local", ".env", ".env.development.local", ".env.development"];
let envLoaded = false;

for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    dotenv.config({ path: envFile });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  // Load from system environment anyway
  dotenv.config();
}

import { generateActionRoadmap, validateQuery } from "@/lib/action-roadmap";

interface CliOptions {
  full?: boolean;
  verbose?: boolean;
}

/**
 * Logs a message to stderr if verbose mode is enabled
 */
function verboseLog(message: string, options: CliOptions): void {
  if (options.verbose) {
    console.error(`[ActionRoadmap CLI] ${message}`);
  }
}

/**
 * Validates that required environment variables are set
 */
function validateEnvironment(): void {
  const requiredVars = ["NEXT_PUBLIC_SUPABASE_URL", "OPENAI_API_KEY"];

  // Check for either service role key (preferred) or anon key
  const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (!hasServiceRoleKey && !hasAnonKey) {
    missingVars.push("SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (missingVars.length > 0) {
    console.error("❌ Error: Missing required environment variables:");
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error("\nPlease ensure these are set in one of the following files:");
    console.error("   - .env.local (recommended)");
    console.error("   - .env");
    console.error("   - .env.development.local");
    console.error("   - .env.development");
    console.error("\nExample .env.local content:");
    console.error("   OPENAI_API_KEY=your_openai_key_here");
    console.error("   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here");
    console.error("   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here  # Recommended for CLI");
    console.error("   # OR");
    console.error("   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here      # Fallback");
    process.exit(1);
  }

  if (hasServiceRoleKey) {
    console.log("✅ Using service role key (bypasses RLS) - optimal for CLI");
  } else {
    console.log("⚠️  Using anon key - may fail if data requires authentication");
  }
}

/**
 * Reads and validates the input file
 */
function readInputFile(filePath: string, options: CliOptions): string {
  const resolvedPath = resolve(filePath);

  verboseLog(`Reading input file: ${resolvedPath}`, options);

  if (!existsSync(resolvedPath)) {
    console.error(`❌ Error: Input file does not exist: ${filePath}`);
    process.exit(1);
  }

  try {
    const content = readFileSync(resolvedPath, "utf-8").trim();

    if (!content) {
      console.error("❌ Error: Input file is empty");
      process.exit(1);
    }

    if (!validateQuery(content)) {
      console.error("❌ Error: Query must be at least 5 characters long");
      process.exit(1);
    }

    verboseLog(`Query read successfully (${content.length} characters)`, options);
    return content;
  } catch (error) {
    console.error(
      `❌ Error reading input file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  program
    .name("action-roadmap-cli")
    .description("Generate action roadmaps from user queries")
    .version("1.0.0")
    .argument("<input-file>", "Text file containing the user query")
    .option("-f, --full", "Output complete JSON response with metadata")
    .option("-v, --verbose", "Enable verbose logging to stderr")
    .parse();

  const options = program.opts<CliOptions>();
  const [inputFile] = program.args;

  if (!inputFile) {
    console.error("❌ Error: Please provide an input file path");
    program.help();
    process.exit(1);
  }

  // Validate environment
  validateEnvironment();
  verboseLog("Environment variables validated", options);

  // Read input file
  const query = readInputFile(inputFile, options);

  try {
    verboseLog("Starting action roadmap generation...", options);

    const result = await generateActionRoadmap(query, {
      verboseLogging: options.verbose,
      includeMetrics: true,
    });

    verboseLog(`Generation completed in ${result.metrics.totalTime}ms`, options);
    verboseLog(`Selected ${result.curatedTools.tools.length} tools`, options);

    // Output results
    if (options.full) {
      // Output complete JSON response
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.prompt);
      console.log("\n----------\n");
      console.log(JSON.stringify(result.aiResult?.result, null, 2));
    }
  } catch (error) {
    console.error("❌ Error generating action roadmap:");

    if (error instanceof Error) {
      console.error(`   ${error.message}`);

      if (options.verbose && error.stack) {
        console.error("\nStack trace:");
        console.error(error.stack);
      }
    } else {
      console.error(`   ${String(error)}`);
    }

    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  process.exit(1);
});

// Run the CLI
if (require.main === module) {
  main();
}
