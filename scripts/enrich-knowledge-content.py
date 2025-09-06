#!/usr/bin/env python3
"""
Knowledge Content Enrichment Script

This script enriches JSON knowledge content files by adding target_persona, 
startup_phase, and problem_category fields using Claude Code in headless mode.

Usage:
    python3 enrich-knowledge-content.py <input_folder> <progress_log_file>

Example:
    python3 enrich-knowledge-content.py scripts/knowledge_content processed_files.json
"""

import argparse
import json
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set
import time


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('enrich-knowledge-content.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class KnowledgeContentEnricher:
    """Enriches knowledge content files with missing target_persona, startup_phase, and problem_category fields."""
    
    def __init__(self, input_folder: str, progress_log_file: str):
        self.input_folder = Path(input_folder)
        self.progress_log_file = Path(progress_log_file)
        self.processed_files: Set[str] = set()
        
        # Validate input folder exists
        if not self.input_folder.exists():
            raise ValueError(f"Input folder does not exist: {input_folder}")
        
        # Load existing progress
        self._load_progress()
    
    def _load_progress(self) -> None:
        """Load progress from the log file if it exists."""
        if self.progress_log_file.exists():
            try:
                with open(self.progress_log_file, 'r') as f:
                    progress_data = json.load(f)
                    self.processed_files = set(progress_data.get('processed_files', []))
                logger.info(f"Loaded progress: {len(self.processed_files)} files already processed")
            except Exception as e:
                logger.warning(f"Failed to load progress file: {e}")
                self.processed_files = set()
        else:
            logger.info("No progress file found, starting fresh")
    
    def _save_progress(self) -> None:
        """Save current progress to the log file."""
        try:
            progress_data = {
                'processed_files': list(self.processed_files),
                'last_updated': time.time(),
                'total_processed': len(self.processed_files)
            }
            with open(self.progress_log_file, 'w') as f:
                json.dump(progress_data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save progress: {e}")
    
    def _get_json_files(self) -> List[Path]:
        """Get all JSON files in the input folder that haven't been processed yet."""
        all_json_files = list(self.input_folder.glob("*.json"))
        unprocessed_files = [f for f in all_json_files if f.name not in self.processed_files]
        
        logger.info(f"Found {len(all_json_files)} JSON files total")
        logger.info(f"Found {len(unprocessed_files)} unprocessed files")
        
        return unprocessed_files
    
    def _create_claude_prompt(self, knowledge_data: Dict) -> str:
        """Create the prompt for Claude Code to analyze the knowledge content."""
        
        # Extract relevant fields
        title = knowledge_data.get('knowledge_piece_name', 'Unknown')
        main_category = knowledge_data.get('main_category', '')
        subcategory = knowledge_data.get('subcategory', '')
        definition = knowledge_data.get('definition', '')
        extra_content = knowledge_data.get('extra_content', '')
        
        prompt = f"""You are helping to categorize knowledge content for the Phoenix Framework, an interactive decision sprint system designed to help startup founders break through analysis paralysis and make high-stakes decisions with confidence.

PROJECT CONTEXT:
The Phoenix Framework addresses the acute pain of decision paralysis that startup founders experience. It uses a semantically searchable knowledge base of mental models, cognitive biases, and strategic frameworks to guide founders from chaotic uncertainty to confident, committed action. The system needs to quickly surface the most relevant knowledge content based on the founder's specific situation, persona, startup phase, and problem category.

KNOWLEDGE CONTENT TO ANALYZE:
Title: {title}
Main Category: {main_category}
Subcategory: {subcategory}
Definition: {definition}
Extra Content: {extra_content[:500]}{'...' if len(extra_content) > 500 else ''}

CATEGORIZATION TASK:
Based on this content and its relevance to helping startup founders make better decisions, please suggest appropriate values for these targeting fields:

1. target_persona: Select from [founder, executive, investor, product_manager]
   - Which personas would most benefit from this knowledge when facing a difficult decision?
   - Founders are our primary audience, but consider other roles that might find this knowledge valuable
   - You can select multiple values

2. startup_phase: Select from [ideation, seed, growth, scale-up, crisis]
   - At which startup phases would this knowledge be most relevant for decision-making?
   - Consider when founders typically face the types of problems this knowledge addresses
   - You can select multiple values

3. problem_category: Select from [pivot, hiring, fundraising, co-founder_conflict, product-market_fit, go-to-market, team_and_culture, operations, competitive_strategy, pricing, risk_management]
   - Which problem categories does this knowledge help address when founders are stuck in analysis paralysis?
   - Think about the specific high-stakes decisions this knowledge would inform
   - You can select multiple values

Please respond with ONLY a valid JSON object in this exact format:
{{
    "target_persona": ["persona1", "persona2"],
    "startup_phase": ["phase1", "phase2"],
    "problem_category": ["category1", "category2"]
}}

Do not include any explanation or additional text, just the JSON object."""

        return prompt
    
    def _call_claude_code(self, prompt: str) -> Optional[Dict]:
        """Call Claude Code with the given prompt."""
        try:
            # Call Claude Code using --print flag
            result = subprocess.run([
                'claude', 
                '--print',
                prompt
            ], capture_output=True, text=True, timeout=120, check=True)  # 2 minute timeout
            
            # Try to parse the JSON response
            response_text = result.stdout.strip()
            
            # Find JSON object in the response (in case there's extra text)
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                return json.loads(json_str)
            else:
                logger.error(f"No valid JSON found in Claude response: {response_text}")
                return None
                
        except subprocess.TimeoutExpired:
            logger.error("Claude Code call timed out")
            return None
        except subprocess.CalledProcessError as e:
            logger.error(f"Claude Code failed with return code {e.returncode}: {e.stderr}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"Error calling Claude Code: {e}")
            return None
    
    def _validate_claude_response(self, response: Dict) -> bool:
        """Validate that Claude's response contains the expected fields with valid values."""
        
        expected_fields = ['target_persona', 'startup_phase', 'problem_category']
        valid_values = {
            'target_persona': {'founder', 'executive', 'investor', 'product_manager'},
            'startup_phase': {'ideation', 'seed', 'growth', 'scale-up', 'crisis'},
            'problem_category': {
                'pivot', 'hiring', 'fundraising', 'co-founder_conflict', 
                'product-market_fit', 'go-to-market', 'team_and_culture', 
                'operations', 'competitive_strategy', 'pricing', 'risk_management'
            }
        }
        
        # Check all required fields are present
        for field in expected_fields:
            if field not in response:
                logger.error(f"Missing field '{field}' in Claude response")
                return False
            
            field_value = response[field]
            if not isinstance(field_value, list):
                logger.error(f"Field '{field}' should be a list, got {type(field_value)}")
                return False
            
            # Check all values are valid
            valid_set = valid_values[field]
            for value in field_value:
                if value not in valid_set:
                    logger.error(f"Invalid value '{value}' for field '{field}'. Valid values: {valid_set}")
                    return False
        
        return True
    
    def _enrich_file(self, file_path: Path) -> bool:
        """Enrich a single JSON file with missing fields."""
        logger.info(f"Processing file: {file_path.name}")
        
        try:
            # Load the JSON file
            with open(file_path, 'r', encoding='utf-8') as f:
                content = json.load(f)
            
            # Check if already has the required fields
            if all(field in content for field in ['target_persona', 'startup_phase', 'problem_category']):
                logger.info(f"File {file_path.name} already has required fields, skipping")
                return True
            
            # Call Claude Code to get suggestions
            prompt = self._create_claude_prompt(content)
            claude_response = self._call_claude_code(prompt)
            
            if claude_response is None:
                logger.error(f"Failed to get response from Claude for {file_path.name}")
                return False
            
            # Validate the response
            if not self._validate_claude_response(claude_response):
                logger.error(f"Invalid response from Claude for {file_path.name}")
                return False
            
            # Add the new fields to the content
            content.update(claude_response)
            
            # Save the updated file
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(content, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Successfully enriched {file_path.name}")
            logger.info(f"Added - target_persona: {claude_response['target_persona']}")
            logger.info(f"Added - startup_phase: {claude_response['startup_phase']}")
            logger.info(f"Added - problem_category: {claude_response['problem_category']}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing {file_path.name}: {e}")
            return False
    
    def enrich_all_files(self) -> None:
        """Enrich all unprocessed JSON files in the input folder."""
        json_files = self._get_json_files()
        
        if not json_files:
            logger.info("No files to process!")
            return
        
        total_files = len(json_files)
        successful_count = 0
        failed_count = 0
        
        logger.info(f"Starting enrichment of {total_files} files...")
        
        for i, file_path in enumerate(json_files, 1):
            logger.info(f"\n--- Processing file {i}/{total_files} ---")
            
            success = self._enrich_file(file_path)
            
            if success:
                successful_count += 1
                # Mark as processed
                self.processed_files.add(file_path.name)
                # Save progress after each successful file
                self._save_progress()
            else:
                failed_count += 1
            
            # Small delay between files to avoid overwhelming Claude API
            if i < total_files:  # Don't delay after the last file
                logger.info("Waiting 2 seconds before next file...")
                time.sleep(2)
        
        # Final summary
        logger.info(f"\n=== ENRICHMENT COMPLETE ===")
        logger.info(f"Total files processed: {total_files}")
        logger.info(f"Successful: {successful_count}")
        logger.info(f"Failed: {failed_count}")
        logger.info(f"Progress saved to: {self.progress_log_file}")


def main():
    """Main function to handle command line arguments and run the enrichment."""
    parser = argparse.ArgumentParser(
        description='Enrich knowledge content JSON files with missing fields using Claude Code'
    )
    parser.add_argument('input_folder', help='Path to folder containing JSON files to process')
    parser.add_argument('progress_log_file', help='Path to progress log file (will be created if it doesn\'t exist)')
    
    args = parser.parse_args()
    
    try:
        enricher = KnowledgeContentEnricher(args.input_folder, args.progress_log_file)
        enricher.enrich_all_files()
    except KeyboardInterrupt:
        logger.info("\nProcess interrupted by user. Progress has been saved.")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()