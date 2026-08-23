# Fabion Model

This directory contains the Fabion Model research project.

**Status:** Planned (Phase 7)

## Goal

Build a real, from-scratch understanding of transformer language models —
not a wrapper around an existing model, but our own implementation.

## Planned structure

```
model/
├── tokenizer/       BPE tokenizer implementation
├── architecture/    Transformer blocks, attention, MLP
├── training/        Training loop, optimizer, loss
├── datasets/        Dataset loading and preprocessing
├── evaluation/      Perplexity, benchmark evaluation
├── inference/       Generation, sampling strategies
└── configs/         Model configurations (tiny → small → ...)
```

## Phase 7 implementation plan

1. Start with a **tiny character-level transformer** (~1M params)
   to validate the full pipeline: tokenize → train → generate.

2. Move to a **BPE tokenizer** and small vocabulary transformer (~10M params).

3. Add proper training infrastructure: gradient accumulation,
   learning rate scheduling, checkpoint saving.

4. Integrate with the Fabion model adapter so the agent can use it.

## Requirements

- Python 3.12+
- PyTorch 2.x
- No large GPU required for tiny experiments

Phase 7 will populate this directory with real code.
