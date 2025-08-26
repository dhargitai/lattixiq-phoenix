# Action Roadmap CLI Script

A command-line interface for generating action roadmaps from user queries.

## Setup

1. **Environment Variables**: Create a `.env.local` file in the project root with:

   ```bash
   OPENAI_API_KEY=your_openai_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

2. **Dependencies**: All required dependencies are already installed via `package.json`

## Usage

### Basic Usage (Output prompt only)

```bash
npx tsx scripts/action-roadmap-cli.ts input-query.txt
```

### Full Output (JSON with metadata)

```bash
npx tsx scripts/action-roadmap-cli.ts --full input-query.txt
```

### Verbose Mode (Show progress)

```bash
npx tsx scripts/action-roadmap-cli.ts --verbose input-query.txt
```

## Input File Format

Create a text file containing your query. The query should be at least 30 characters long and describe a problem or goal you want to create a roadmap for.

**Example input file (`my-query.txt`):**

```
I'm struggling to make strategic decisions for my startup. We have limited resources and need to prioritize between product development, marketing, and hiring. The market is competitive and I feel overwhelmed by all the options and potential consequences of each choice. How can I think more clearly about this complex decision and avoid common pitfalls?
```

## Output

- **Default**: Outputs the AI-ready prompt to stdout (suitable for piping)
- **--full**: Outputs complete JSON with analysis, curated tools, metrics, and metadata
- **--verbose**: Shows progress messages to stderr while processing

## Error Handling

The script will exit with appropriate error codes:

- `1`: Missing environment variables, file not found, or generation errors
- `0`: Success

## Examples

```bash
# Create a query file
echo "How can I improve my decision-making under uncertainty?" > decision-query.txt

# Generate roadmap prompt
npx tsx scripts/action-roadmap-cli.ts decision-query.txt > generated-prompt.txt

# Generate with full details
npx tsx scripts/action-roadmap-cli.ts --full decision-query.txt > full-output.json

# Monitor progress
npx tsx scripts/action-roadmap-cli.ts --verbose decision-query.txt
```

## Integration with Other Tools

The script is designed to be easily integrated into other workflows:

```bash
# Pipe output to another AI tool
npx tsx scripts/action-roadmap-cli.ts query.txt | your-ai-tool

# Save output for later use
npx tsx scripts/action-roadmap-cli.ts --full query.txt > roadmap-$(date +%Y%m%d).json
```
