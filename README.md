# Exam Study Companions

This repository contains two related exam study companion applications:

## Projects

### CIP/ - Certified IRB Professional Exam Study Companion
Interactive study tool for CIP (Certified IRB Professional) exam preparation.

**Features:**
- Documents: Federal regulations, ethical codes, and guidance documents
- Glossary: Searchable terms with regulatory citations and flashcard mode
- Historical Foundations: Timeline of landmark cases and regulatory milestones
- Knowledge Checks: Practice questions aligned with the CIP® Content Outline

### CPIA/ - Certified IRB Administrator Exam Study Companion
Interactive study tool for CPIA (Certified IRB Administrator) exam preparation.

**Features:**
- Glossary: Searchable terms with regulatory citations and flashcard mode
- Knowledge Checks: Practice questions aligned with the CPIA® Content Outline

## Structure

Both projects share similar code architecture:
```
CIP/ or CPIA/
├── index.html          # Main application
├── css/
│   └── styles.css      # Consolidated stylesheet (includes dark mode)
├── js/                 # Application modules
│   ├── main.js
│   ├── state-manager.js
│   ├── glossary.js
│   ├── quiz.js
│   └── ...
└── data/               # JSON data files
    ├── glossary.json
    └── quiz.json
```

## Development Workflow

Both projects are maintained in tandem to keep shared code synchronized:
1. Make changes to both projects simultaneously when updating shared functionality
2. Update content-specific files (data/*.json) individually as needed
3. Test both projects after making changes
4. Create deployment zips for tiiny.site hosting

## Deployment

1. Create zip files for each project
2. Upload to tiiny.site:
   - CIP → cip.tiiny.site
   - CPIA → cpia.tiiny.site

## Version
Latest: v1.0(14) - December 2024
