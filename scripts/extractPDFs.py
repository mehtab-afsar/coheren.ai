#!/usr/bin/env python3
"""
CONSIST RAG - PDF Extraction & Embedding Pipeline
Extracts text from habit science books and research papers,
chunks them, generates embeddings, and stores in ChromaDB.
"""

import os
import json
import hashlib
from pathlib import Path
from typing import List, Dict, Any

# PDF extraction
try:
    import fitz  # PyMuPDF
except ImportError:
    print("Install PyMuPDF: pip install pymupdf")
    exit(1)

# Embeddings & Vector Store
try:
    from sentence_transformers import SentenceTransformer
    import chromadb
    from chromadb.config import Settings
except ImportError:
    print("Install dependencies: pip install sentence-transformers chromadb")
    exit(1)

# Configuration
BOOKS_DIR = Path(__file__).parent.parent / "books"
RESEARCH_DIR = BOOKS_DIR / "research papers"
OUTPUT_DIR = Path(__file__).parent.parent / "src" / "knowledge"
CHROMA_DIR = Path(__file__).parent.parent / "chroma_db"

# Chunk settings
CHUNK_SIZE = 500  # tokens (approximate)
CHUNK_OVERLAP = 50
CHARS_PER_TOKEN = 4  # rough estimate

# Book metadata for categorization
BOOK_METADATA = {
    "Atomic Habits": {
        "author": "James Clear",
        "categories": ["habit-formation", "behavior-change", "systems"],
        "key_concepts": ["4 laws", "habit stacking", "1% better", "identity"]
    },
    "The power of habit": {
        "author": "Charles Duhigg",
        "categories": ["habit-loop", "neuroscience", "behavior-change"],
        "key_concepts": ["cue", "routine", "reward", "keystone habits"]
    },
    "Tiny Habits": {
        "author": "BJ Fogg",
        "categories": ["behavior-design", "habit-formation", "motivation"],
        "key_concepts": ["anchor", "tiny behavior", "celebration", "motivation wave"]
    },
    "Compound Effect": {
        "author": "Darren Hardy",
        "categories": ["consistency", "long-term", "compounding"],
        "key_concepts": ["small actions", "compound growth", "momentum"]
    },
    "Thinking, Fast and Slow": {
        "author": "Daniel Kahneman",
        "categories": ["psychology", "decision-making", "cognitive-bias"],
        "key_concepts": ["system 1", "system 2", "heuristics", "bias"]
    },
    "Nudge": {
        "author": "Thaler & Sunstein",
        "categories": ["behavior-design", "choice-architecture", "defaults"],
        "key_concepts": ["nudge", "choice architecture", "libertarian paternalism"]
    },
    "willpower_instinct": {
        "author": "Kelly McGonigal",
        "categories": ["willpower", "self-control", "neuroscience"],
        "key_concepts": ["willpower", "self-control", "stress", "prefrontal cortex"]
    },
    "grit": {
        "author": "Angela Duckworth",
        "categories": ["perseverance", "passion", "long-term"],
        "key_concepts": ["grit", "passion", "perseverance", "deliberate practice"]
    },
    "drive": {
        "author": "Daniel Pink",
        "categories": ["motivation", "intrinsic", "autonomy"],
        "key_concepts": ["autonomy", "mastery", "purpose", "intrinsic motivation"]
    },
    "Mindset": {
        "author": "Carol Dweck",
        "categories": ["mindset", "growth", "learning"],
        "key_concepts": ["growth mindset", "fixed mindset", "effort", "learning"]
    },
    "ONE-Thing": {
        "author": "Gary Keller",
        "categories": ["focus", "priority", "productivity"],
        "key_concepts": ["one thing", "focus", "domino effect", "priority"]
    },
    "getting-things-done": {
        "author": "David Allen",
        "categories": ["productivity", "task-management", "systems"],
        "key_concepts": ["capture", "clarify", "organize", "review", "engage"]
    },
    "Make-Time": {
        "author": "Jake Knapp",
        "categories": ["time-management", "focus", "energy"],
        "key_concepts": ["highlight", "laser", "energize", "reflect"]
    },
    "Brain-Changes": {
        "author": "Norman Doidge",
        "categories": ["neuroscience", "neuroplasticity", "brain"],
        "key_concepts": ["neuroplasticity", "brain change", "rewiring"]
    },
    "Dopamine": {
        "author": "Anna Lembke",
        "categories": ["neuroscience", "dopamine", "addiction", "balance"],
        "key_concepts": ["dopamine", "pleasure-pain balance", "addiction", "reset"]
    },
    # Research papers
    "RyanDeci_SDT": {
        "author": "Ryan & Deci",
        "categories": ["motivation", "self-determination", "psychology"],
        "key_concepts": ["autonomy", "competence", "relatedness", "intrinsic motivation"]
    },
    "NeuroscienceofHabitFormation": {
        "author": "Wyatt (2024)",
        "categories": ["neuroscience", "habit-formation", "brain"],
        "key_concepts": ["basal ganglia", "dopamine", "neuroplasticity", "striatum"]
    }
}


def get_book_metadata(filename: str) -> Dict[str, Any]:
    """Match filename to metadata."""
    filename_lower = filename.lower()
    for key, meta in BOOK_METADATA.items():
        if key.lower() in filename_lower:
            return meta
    # Default metadata
    return {
        "author": "Unknown",
        "categories": ["general"],
        "key_concepts": []
    }


def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract all text from a PDF file."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks."""
    # Convert token-based size to character-based
    char_chunk_size = chunk_size * CHARS_PER_TOKEN
    char_overlap = overlap * CHARS_PER_TOKEN

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + char_chunk_size

        # Try to end at a sentence boundary
        if end < text_length:
            # Look for sentence end within last 200 chars
            for i in range(min(200, end - start)):
                if text[end - i] in '.!?\n':
                    end = end - i + 1
                    break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        start = end - char_overlap

    return chunks


def generate_chunk_id(source: str, chunk_index: int) -> str:
    """Generate unique ID for each chunk."""
    content = f"{source}_{chunk_index}"
    return hashlib.md5(content.encode()).hexdigest()[:12]


def process_pdfs() -> List[Dict[str, Any]]:
    """Process all PDFs and return chunks with metadata."""
    all_chunks = []

    # Process books
    if BOOKS_DIR.exists():
        for pdf_file in BOOKS_DIR.glob("*.pdf"):
            print(f"Processing: {pdf_file.name}")
            try:
                text = extract_text_from_pdf(pdf_file)
                chunks = chunk_text(text)
                metadata = get_book_metadata(pdf_file.name)

                for i, chunk in enumerate(chunks):
                    all_chunks.append({
                        "id": generate_chunk_id(pdf_file.name, i),
                        "text": chunk,
                        "source": pdf_file.name,
                        "author": metadata["author"],
                        "categories": metadata["categories"],
                        "key_concepts": metadata["key_concepts"],
                        "chunk_index": i,
                        "total_chunks": len(chunks)
                    })
                print(f"  -> {len(chunks)} chunks extracted")
            except Exception as e:
                print(f"  -> Error: {e}")

    # Process research papers
    if RESEARCH_DIR.exists():
        for pdf_file in RESEARCH_DIR.glob("*.pdf"):
            print(f"Processing: {pdf_file.name}")
            try:
                text = extract_text_from_pdf(pdf_file)
                chunks = chunk_text(text)
                metadata = get_book_metadata(pdf_file.name)

                for i, chunk in enumerate(chunks):
                    all_chunks.append({
                        "id": generate_chunk_id(pdf_file.name, i),
                        "text": chunk,
                        "source": pdf_file.name,
                        "author": metadata["author"],
                        "categories": metadata["categories"],
                        "key_concepts": metadata["key_concepts"],
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                        "is_research": True
                    })
                print(f"  -> {len(chunks)} chunks extracted")
            except Exception as e:
                print(f"  -> Error: {e}")

    return all_chunks


def create_embeddings(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate embeddings for all chunks."""
    print("\nGenerating embeddings...")
    model = SentenceTransformer('all-MiniLM-L6-v2')

    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=True)

    for i, chunk in enumerate(chunks):
        chunk["embedding"] = embeddings[i].tolist()

    return chunks


def store_in_chroma(chunks: List[Dict[str, Any]]):
    """Store chunks in ChromaDB."""
    print("\nStoring in ChromaDB...")

    CHROMA_DIR.mkdir(parents=True, exist_ok=True)

    client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    # Delete existing collection if exists
    try:
        client.delete_collection("habit_science")
    except:
        pass

    collection = client.create_collection(
        name="habit_science",
        metadata={"description": "Habit science knowledge base for CONSIST"}
    )

    # Prepare data for insertion
    ids = [c["id"] for c in chunks]
    embeddings = [c["embedding"] for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [{
        "source": c["source"],
        "author": c["author"],
        "categories": ",".join(c["categories"]),
        "key_concepts": ",".join(c["key_concepts"]),
        "chunk_index": c["chunk_index"],
        "is_research": c.get("is_research", False)
    } for c in chunks]

    # Insert in batches
    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        end = min(i + batch_size, len(chunks))
        collection.add(
            ids=ids[i:end],
            embeddings=embeddings[i:end],
            documents=documents[i:end],
            metadatas=metadatas[i:end]
        )
        print(f"  Stored {end}/{len(chunks)} chunks")

    print(f"\nDone! Stored {len(chunks)} chunks in ChromaDB at {CHROMA_DIR}")


def export_to_json(chunks: List[Dict[str, Any]]):
    """Export chunks to JSON for backup/inspection."""
    output_file = OUTPUT_DIR / "chunks.json"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Remove embeddings for JSON export (too large)
    export_chunks = [{k: v for k, v in c.items() if k != "embedding"} for c in chunks]

    with open(output_file, "w") as f:
        json.dump(export_chunks, f, indent=2)

    print(f"Exported chunks to {output_file}")


def main():
    print("=" * 60)
    print("CONSIST RAG - PDF Extraction Pipeline")
    print("=" * 60)

    # Step 1: Extract text from PDFs
    print("\n[1/4] Extracting text from PDFs...")
    chunks = process_pdfs()

    if not chunks:
        print("No chunks extracted! Check that PDFs exist in the books/ directory.")
        return

    print(f"\nTotal chunks: {len(chunks)}")

    # Step 2: Generate embeddings
    print("\n[2/4] Generating embeddings...")
    chunks = create_embeddings(chunks)

    # Step 3: Store in ChromaDB
    print("\n[3/4] Storing in ChromaDB...")
    store_in_chroma(chunks)

    # Step 4: Export to JSON
    print("\n[4/4] Exporting to JSON...")
    export_to_json(chunks)

    print("\n" + "=" * 60)
    print("Pipeline complete!")
    print("=" * 60)
    print(f"\nNext steps:")
    print(f"1. Run: python scripts/extractPDFs.py")
    print(f"2. ChromaDB stored at: {CHROMA_DIR}")
    print(f"3. Use retrieval.ts to query the knowledge base")


if __name__ == "__main__":
    main()
