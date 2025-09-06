import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from "fs";
import { join } from "path";
import { createLogger, format, transports } from "winston";
import type { EmbeddingInput, EmbeddingResult } from "./lib/embeddings-service";
import { generateEmbeddings, prepareTextForEmbedding } from "./lib/embeddings-service";
import type { Database } from "../supabase/database.types";
import type { KnowledgeContent } from "../supabase/types";

// Load environment variables
config({ path: ".env.local" });

// Parse command-line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  let contentFolder = join(process.cwd(), "scripts", "knowledge_content"); // default
  
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--content-folder' || args[i] === '-c') && args[i + 1]) {
      contentFolder = args[i + 1];
      i++; // skip next arg
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: tsx scripts/generate-embeddings.ts [options]

Options:
  --content-folder, -c <path>  Path to folder containing JSON knowledge content files
                               (default: scripts/knowledge_content)
  --help, -h                   Show this help message

Examples:
  tsx scripts/generate-embeddings.ts
  tsx scripts/generate-embeddings.ts --content-folder ./my-content
  tsx scripts/generate-embeddings.ts -c /path/to/json/files
`);
      process.exit(0);
    }
  }
  
  return { contentFolder };
}

const { contentFolder } = parseArguments();

// Constants
const BATCH_SIZE = 20; // Process 20 items at a time to avoid rate limits
const DELAY_MS = 5000; // 5 seconds delay between batches
const MAX_RETRIES = 3;
const PROGRESS_FILE = "embeddings-progress.json";
const EXPECTED_DIMENSIONS = 1536; // text-embedding-3-small dimensions

// Configure logger
const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [
    new transports.File({ filename: "embeddings-generation.log" }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

// Initialize Supabase client with service role for admin access
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // You'll need to add this to .env.local
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Delays execution for the specified milliseconds
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Interface for JSON knowledge content structure
 */
interface JSONKnowledgeContent {
  knowledge_piece_name: string;
  main_category: string;
  subcategory: string;
  hook?: string;
  definition?: string;
  analogy_or_metaphor?: string;
  key_takeaway?: string;
  classic_example?: string;
  modern_example?: string;
  pitfall?: string;
  payoff?: string;
  visual_metaphor?: string;
  visual_metaphor_url?: string;
  dive_deeper_mechanism?: string;
  dive_deeper_origin_story?: string;
  dive_deeper_pitfalls_nuances?: string;
  super_model?: boolean;
  extra_content?: string;
  target_persona: string[];
  startup_phase: string[];
  problem_category: string[];
  source_file?: string;
}

/**
 * Maps JSON structure to database KnowledgeContent structure
 */
function mapJSONToKnowledgeContent(jsonContent: JSONKnowledgeContent): Omit<KnowledgeContent, 'id' | 'created_at' | 'updated_at' | 'embedding'> {
  return {
    title: jsonContent.knowledge_piece_name, // Main mapping: knowledge_piece_name → title
    main_category: jsonContent.main_category as any,
    subcategory: jsonContent.subcategory as any,
    type: inferContentType(jsonContent), // Infer from content or use default
    language: "English", // Default language
    hook: jsonContent.hook || null,
    definition: jsonContent.definition || null,
    analogy_or_metaphor: jsonContent.analogy_or_metaphor || null,
    key_takeaway: jsonContent.key_takeaway || null,
    classic_example: jsonContent.classic_example || null,
    modern_example: jsonContent.modern_example || null,
    pitfall: jsonContent.pitfall || null,
    payoff: jsonContent.payoff || null,
    visual_metaphor: jsonContent.visual_metaphor || null,
    visual_metaphor_url: jsonContent.visual_metaphor_url || null,
    dive_deeper_mechanism: jsonContent.dive_deeper_mechanism || null,
    dive_deeper_origin_story: jsonContent.dive_deeper_origin_story || null,
    dive_deeper_pitfalls_nuances: jsonContent.dive_deeper_pitfalls_nuances || null,
    super_model: jsonContent.super_model || false,
    extra_content: jsonContent.extra_content || null,
    target_persona: jsonContent.target_persona as any,
    startup_phase: jsonContent.startup_phase as any,
    problem_category: jsonContent.problem_category as any,
  };
}

/**
 * Infers content type from the content structure or defaults to mental-model
 */
function inferContentType(content: JSONKnowledgeContent): "mental-model" | "cognitive-bias" | "fallacy" | "strategic-framework" | "tactical-tool" {
  // Use subcategory to infer type if possible
  const subcategory = content.subcategory.toLowerCase();
  
  if (subcategory.includes('bias')) {
    return 'cognitive-bias';
  } else if (subcategory.includes('fallacy')) {
    return 'fallacy';
  } else if (content.knowledge_piece_name.toLowerCase().includes('framework')) {
    return 'strategic-framework';
  } else if (content.knowledge_piece_name.toLowerCase().includes('tool') || 
             content.knowledge_piece_name.toLowerCase().includes('method')) {
    return 'tactical-tool';
  }
  
  // Default to mental-model
  return 'mental-model';
}

/**
 * Progress tracking interface
 */
interface Progress {
  processedFiles: string[]; // Track by file name for better resumability
  processedTitles: string[]; // Keep for backward compatibility and duplicate detection
  lastProcessedBatch: number;
  totalProcessed: number;
  totalErrors: number;
  startTime: string;
  lastUpdateTime: string;
}

/**
 * Load progress from file
 */
function loadProgress(): Progress | null {
  try {
    if (existsSync(PROGRESS_FILE)) {
      const data = readFileSync(PROGRESS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    logger.warn("Failed to load progress file", { error });
  }
  return null;
}

/**
 * Save progress to file
 */
function saveProgress(progress: Progress): void {
  try {
    writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    logger.error("Failed to save progress", { error });
  }
}

/**
 * Generate embeddings with retry logic and exponential backoff
 */
async function generateEmbeddingsWithRetry(
  inputs: EmbeddingInput[],
  maxRetries = MAX_RETRIES
): Promise<EmbeddingResult[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Generating embeddings for batch`, {
        attempt,
        batchSize: inputs.length,
      });

      const results = await generateEmbeddings(inputs);

      // Validate embedding dimensions
      for (const result of results) {
        if (result.embedding.length !== EXPECTED_DIMENSIONS) {
          throw new Error(
            `Invalid embedding dimensions: expected ${EXPECTED_DIMENSIONS}, got ${result.embedding.length}`
          );
        }
      }

      return results;
    } catch (error: unknown) {
      logger.error(`Embedding generation attempt ${attempt} failed`, {
        error: error instanceof Error ? error.message : String(error),
        attempt,
        maxRetries,
      });

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const waitTime = Math.pow(2, attempt) * 1000;
      logger.info(`Retrying in ${waitTime}ms...`);
      await delay(waitTime);
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * Calculate estimated cost for embeddings
 */
function calculateCost(tokenCount: number): number {
  const COST_PER_MILLION_TOKENS = 0.02; // text-embedding-3-small
  return (tokenCount / 1_000_000) * COST_PER_MILLION_TOKENS;
}

/**
 * Estimate tokens for a text (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: ~1 token per 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Main function to generate and store embeddings
 */
async function generateAndStoreEmbeddings() {
  logger.info("Starting embedding generation process");

  const startTime = new Date();
  let totalTokensUsed = 0;
  let progress = loadProgress();

  // Initialize progress if not resuming
  if (!progress) {
    progress = {
      processedFiles: [],
      processedTitles: [],
      lastProcessedBatch: -1,
      totalProcessed: 0,
      totalErrors: 0,
      startTime: startTime.toISOString(),
      lastUpdateTime: startTime.toISOString(),
    };
  } else {
    // Ensure backward compatibility - initialize processedFiles if not present
    if (!progress.processedFiles) {
      progress.processedFiles = [];
    }
    
    logger.info("Resuming from previous progress", {
      processedFiles: progress.processedFiles.length,
      processedTitles: progress.processedTitles.length,
      lastBatch: progress.lastProcessedBatch,
    });
  }

  try {
    // 1. Load knowledge content from JSON files in specified directory
    logger.info(`Loading knowledge content from directory: ${contentFolder}`);
    
    if (!existsSync(contentFolder)) {
      throw new Error(`Knowledge content directory does not exist: ${contentFolder}`);
    }
    
    const allJsonFiles = readdirSync(contentFolder).filter(file => file.endsWith('.json'));
    logger.info(`Found ${allJsonFiles.length} JSON files in directory`);
    
    // Filter out already processed files
    const processedFilesSet = new Set(progress.processedFiles);
    const unprocessedFiles = allJsonFiles.filter(file => !processedFilesSet.has(file));
    
    logger.info(`Files status:`, {
      total: allJsonFiles.length,
      alreadyProcessed: processedFilesSet.size,
      toProcess: unprocessedFiles.length
    });
    
    if (unprocessedFiles.length === 0) {
      logger.info("All files in directory have already been processed!");
      return;
    }
    
    const knowledgeContent: ReturnType<typeof mapJSONToKnowledgeContent>[] = [];
    const failedFiles: string[] = [];
    const processedFiles: string[] = [];
    
    // Load and parse each unprocessed JSON file
    for (const fileName of unprocessedFiles) {
      try {
        const filePath = join(contentFolder, fileName);
        const rawContent = readFileSync(filePath, "utf-8");
        const jsonContent: JSONKnowledgeContent = JSON.parse(rawContent);
        
        // Map JSON structure to database structure
        const mappedContent = mapJSONToKnowledgeContent(jsonContent);
        knowledgeContent.push(mappedContent);
        
        // Track that we successfully loaded this file
        processedFiles.push(fileName);
        
        logger.debug(`Successfully loaded: ${fileName}`, { title: mappedContent.title });
      } catch (error) {
        logger.error(`Failed to load file: ${fileName}`, { error });
        failedFiles.push(fileName);
      }
    }

    logger.info(`Successfully loaded knowledge items`, { 
      successCount: knowledgeContent.length, 
      failedCount: failedFiles.length,
      failedFiles: failedFiles.length > 0 ? failedFiles : undefined
    });

    // 2. Check existing embeddings to avoid duplicates
    const { data: existingRecords } = await supabase
      .from("knowledge_content")
      .select("id, title")
      .not("embedding", "is", null);

    const existingTitles = new Set(existingRecords?.map((r) => r.title) || []);

    // Combine with already processed titles from progress
    const allProcessedTitles = new Set([
      ...Array.from(existingTitles),
      ...progress.processedTitles,
    ]);

    logger.info(`Found existing embeddings`, {
      existingCount: existingTitles.size,
      previouslyProcessed: progress.processedTitles.length,
    });

    // 3. Prepare items for embedding
    const itemsToProcess = knowledgeContent.filter(
      (item: { title: string }) => !allProcessedTitles.has(item.title)
    );

    if (itemsToProcess.length === 0) {
      logger.info("All items already have embeddings!");
      return;
    }

    logger.info(`Processing items without embeddings`, { count: itemsToProcess.length });

    // 4. Process in batches
    const batches = [];
    for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
      batches.push(itemsToProcess.slice(i, i + BATCH_SIZE));
    }

    let processedCount = progress.totalProcessed;
    let errorCount = progress.totalErrors;

    // Start from the last processed batch + 1
    const startBatchIndex = progress.lastProcessedBatch + 1;

    for (let batchIndex = startBatchIndex; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.info(`Processing batch`, {
        batchNumber: batchIndex + 1,
        totalBatches: batches.length,
        batchSize: batch.length,
      });

      try {
        // Prepare texts for embedding
        const embeddingInputs: EmbeddingInput[] = batch.map((item, index) => ({
          id: `${batchIndex}_${index}`, // Use batch index and item index as temporary ID
          text: prepareTextForEmbedding(item as KnowledgeContent),
        }));

        // Estimate tokens for cost tracking
        const batchTokens = embeddingInputs.reduce(
          (sum, input) => sum + estimateTokens(input.text),
          0
        );
        totalTokensUsed += batchTokens;

        // Generate embeddings with retry logic
        const embeddings = await generateEmbeddingsWithRetry(embeddingInputs);

        // Store in database
        for (let i = 0; i < embeddings.length; i++) {
          const { embedding } = embeddings[i];
          const item = batch[i]; // Get item by index since we use index-based IDs

          try {
            // First, check if this knowledge content already exists by title
            const { data: existingItem } = await supabase
              .from("knowledge_content")
              .select("id")
              .eq("title", item.title)
              .single();

            const knowledgeId = existingItem?.id;

            if (knowledgeId) {
              // Update existing record with embedding
              const { error: updateError } = await supabase
                .from("knowledge_content")
                .update({ embedding: JSON.stringify(embedding) })
                .eq("id", knowledgeId);

              if (updateError) {
                throw updateError;
              }
            } else {
              // Insert new record with all fields (let database generate UUID)
              const { data: insertedItem, error: insertError } = await supabase
                .from("knowledge_content")
                .insert({
                  title: item.title,
                  main_category: item.main_category,
                  subcategory: item.subcategory,
                  type: item.type,
                  language: item.language,
                  hook: item.hook,
                  definition: item.definition,
                  analogy_or_metaphor: item.analogy_or_metaphor,
                  key_takeaway: item.key_takeaway,
                  classic_example: item.classic_example,
                  modern_example: item.modern_example,
                  pitfall: item.pitfall,
                  payoff: item.payoff,
                  visual_metaphor: item.visual_metaphor,
                  visual_metaphor_url: item.visual_metaphor_url,
                  dive_deeper_mechanism: item.dive_deeper_mechanism,
                  dive_deeper_origin_story: item.dive_deeper_origin_story,
                  dive_deeper_pitfalls_nuances: item.dive_deeper_pitfalls_nuances,
                  super_model: item.super_model,
                  extra_content: item.extra_content,
                  target_persona: item.target_persona,
                  startup_phase: item.startup_phase,
                  problem_category: item.problem_category,
                  embedding: JSON.stringify(embedding),
                })
                .select("id")
                .single();

              if (insertError) {
                throw insertError;
              }
            }

            processedCount++;
            progress.processedTitles.push(item.title);
            logger.info(`Stored embedding`, { title: item.title });
          } catch (error) {
            logger.error(`Error storing embedding`, {
              title: item.title,
              error,
            });
            errorCount++;
          }
        }

        // Update progress after successful batch
        progress.lastProcessedBatch = batchIndex;
        progress.totalProcessed = processedCount;
        progress.totalErrors = errorCount;
        progress.lastUpdateTime = new Date().toISOString();
        saveProgress(progress);

        // Rate limiting delay between batches
        if (batchIndex < batches.length - 1) {
          logger.info(`Rate limiting delay`, { delayMs: DELAY_MS });
          await delay(DELAY_MS);
        }
      } catch (error) {
        logger.error(`Batch failed`, {
          batchNumber: batchIndex + 1,
          error,
        });
        errorCount += batch.length;

        // Update error count in progress
        progress.totalErrors = errorCount;
        saveProgress(progress);
      }
    }

    // 5. Update progress with successfully processed files and final report
    const allProcessedFiles = progress.processedFiles.concat(processedFiles);
    progress.processedFiles = Array.from(new Set(allProcessedFiles)); // Remove duplicates
    progress.lastUpdateTime = new Date().toISOString();
    saveProgress(progress);
    
    const endTime = new Date();
    const durationMs = endTime.getTime() - new Date(progress.startTime).getTime();
    const estimatedCost = calculateCost(totalTokensUsed);

    logger.info("Embedding generation complete", {
      successfullyProcessed: processedCount,
      errors: errorCount,
      processedFiles: processedFiles.length,
      totalProcessedFiles: progress.processedFiles.length,
      totalEmbeddingsInDb: existingTitles.size + processedCount,
      durationSeconds: Math.round(durationMs / 1000),
      estimatedTokensUsed: totalTokensUsed,
      estimatedCostUSD: estimatedCost.toFixed(4),
    });

    // Clean up progress file on successful completion
    if (errorCount === 0) {
      try {
        if (existsSync(PROGRESS_FILE)) {
          unlinkSync(PROGRESS_FILE);
          logger.info("Progress file cleaned up");
        }
      } catch (error) {
        logger.warn("Failed to clean up progress file", { error });
      }
    }
  } catch (error) {
    logger.error("Fatal error", { error });
    process.exit(1);
  }
}

// Run the script
generateAndStoreEmbeddings()
  .then(() => {
    logger.info("Process completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Process failed", { error });
    process.exit(1);
  });
