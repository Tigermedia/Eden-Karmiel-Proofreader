# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Multi-page PDF support with page-by-page analysis
- Page separators in extracted text display (`── עמוד X ──`)
- Page number labels in PDF preview for multi-page documents
- Progress indicator showing current page during analysis

### Changed
- Switched from Claude to Gemini 2.0 Flash as the default AI engine
- Removed AI provider toggle - now uses Gemini exclusively
- Improved status messages to show page progress

## [1.0.0] - 2025-01-13

### Added
- Initial Hebrew Tombstone PDF Proofreader application
- PDF to image conversion using pdf.js
- Gemini 2.0 Flash integration for Hebrew text extraction
- Hebrew date validation with @hebcal/core library
- Split layout UI with PDF preview on left, report on right
- Proofreading categories:
  - Spelling errors (שגיאות כתיב)
  - Grammar errors (שגיאות דקדוק)
  - Abbreviation validation (פ"נ, ז"ל, ת.נ.צ.ב.ה)
  - Hebrew-Gregorian date consistency
  - Biblical quote accuracy
- RTL (right-to-left) Hebrew interface
- Drag-and-drop PDF upload
- Responsive design for mobile devices
- Image resizing to comply with API dimension limits (max 4000px)

### Security
- API keys stored in environment variables (.env.local)
- Vite proxy for Claude API to avoid CORS issues

[Unreleased]: https://github.com/your-repo/hebrew-tombstone-proofreader/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-repo/hebrew-tombstone-proofreader/releases/tag/v1.0.0
